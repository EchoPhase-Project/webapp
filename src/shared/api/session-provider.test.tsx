// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { Route } from '@solidjs/router';
import { createEffect, createSignal } from 'solid-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query';
import { fakeApi, json, user } from '@shared/testing/fake-api';
import { renderPage, renderRoutes } from '@shared/testing/render-page';
import { requireAuth } from './auth-guards';
import { authKeys, meQuery, updateProfileMutation, useAuth } from './auth';
import { api, request, send } from './client';
import { CsrfService } from './csrf';
import {
    endSession,
    forgetStored,
    onSessionChange,
    openTabs,
    sessionClient,
    sessionScoped,
    sessionStore,
    startSession,
    type TabMessage,
} from './session-provider';
import type { User } from './types';

const anna = user({ id: 'anna', name: 'Anna' }) as User;
const boris = user({ id: 'boris', name: 'Boris' }) as User;

/** A response the test answers when it wants. */
function later() {
    let answer: (response: Response) => void = () => {};
    const response = new Promise<Response>((done) => (answer = done));
    return { response, answer };
}

const ticks = () => new Promise((done) => setTimeout(done, 0));

/** Who the tree under SessionProvider sees. */
function Who() {
    const auth = useAuth();
    return (
        <p data-testid="who">
            {auth.user() === undefined
                ? 'loading'
                : (auth.user()?.name ?? 'nobody')}
        </p>
    );
}

const who = () => screen.getByTestId('who').textContent;

/** The routes /auth/me and /roles/me answer for `me` (null: signed out). */
const meAs = (get: () => User | null) => ({
    'GET /api/v1/auth/me': () => {
        const me = get();
        return me ? json(200, me) : json(401);
    },
    'GET /api/v1/roles/me': () => json(200, []),
});

afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
});

describe('a client per session', () => {
    it('leaves nothing of the previous user after a sign-out and sign-in', async () => {
        let me: User | null = anna;
        const server = fakeApi({
            ...meAs(() => me),
            'GET /api/v1/notes': () =>
                json(200, [{ id: 'n1', title: `${me?.name}'s note` }]),
        });
        function Notes() {
            const notes = useQuery(() => ({
                queryKey: ['notes'],
                queryFn: () =>
                    request(
                        api.GET('/api/v1/notes', { params: { query: {} } })
                    ),
            }));
            return <p>{notes.data?.map((note) => note.title).join(', ')}</p>;
        }
        renderPage(() => (
            <>
                <Who />
                <Notes />
            </>
        ));
        expect(await screen.findByText("Anna's note")).toBeTruthy();
        const annas = sessionClient();

        endSession();
        me = boris;
        startSession(boris, '/');

        expect(await screen.findByText("Boris's note")).toBeTruthy();
        expect(screen.queryByText("Anna's note")).toBeNull();
        // Asked anew by each tree: Anna's, the signed-out one (this page has
        // no guard), Boris's; never answered from the cache.
        expect(server.calls('GET /api/v1/notes')).toHaveLength(3);
        // The old client is cleared, its queries gone.
        expect(annas.getQueryCache().getAll()).toHaveLength(0);
        expect(sessionClient().getQueryData(['notes'])).toEqual([
            { id: 'n1', title: "Boris's note" },
        ]);
    });

    it("keeps a late answer of the previous user's mutation out of the next session", async () => {
        const patch = later();
        let me: User | null = anna;
        fakeApi({
            ...meAs(() => me),
            'PATCH /api/v1/auth/me': () => patch.response,
        });
        function Rename() {
            const queryClient = useQueryClient();
            const rename = useMutation(() =>
                updateProfileMutation(queryClient)
            );
            return (
                <button
                    onClick={() =>
                        rename.mutate({
                            name: 'Anna K',
                            username: null,
                            timeZone: null,
                        })
                    }
                >
                    rename
                </button>
            );
        }
        renderPage(() => (
            <>
                <Who />
                <Rename />
            </>
        ));
        await waitFor(() => expect(who()).toBe('Anna'));
        fireEvent.click(screen.getByText('rename'));

        endSession();
        me = boris;
        startSession(boris, '/');
        await waitFor(() => expect(who()).toBe('Boris'));

        patch.answer(json(200, { ...anna, name: 'Anna K' }));
        await ticks();
        await ticks();

        expect(who()).toBe('Boris');
        expect(sessionClient().getQueryData(authKeys.me())).toEqual(boris);
    });

    it("ignores a 401 of the previous session's request", async () => {
        const slow = later();
        let me: User | null = anna;
        fakeApi({
            ...meAs(() => me),
            'GET /api/v1/sessions': () => slow.response,
        });
        const { otherTab } = renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('Anna'));

        const annasCall = send(api.GET('/api/v1/sessions'));
        await ticks(); // the request is out (and marked with Anna's session)
        endSession();
        me = boris;
        startSession(boris, '/');
        const borisSession = sessionClient();

        slow.answer(json(401));
        await annasCall;
        await ticks();

        expect(sessionClient()).toBe(borisSession);
        expect(who()).toBe('Boris');
        expect(otherTab.received).toEqual([
            { type: 'signed-out' },
            { type: 'signed-in' },
        ]);
    });

    it('rebuilds once and redirects once for five 401s at a time', async () => {
        fakeApi({
            ...meAs(() => anna),
            'GET /api/v1/sessions': () => json(401),
        });
        let made = 0;
        const { history, otherTab } = renderRoutes(
            () => (
                <>
                    <Route
                        path="/sessions"
                        component={requireAuth(() => {
                            made++;
                            return <p>secret page</p>;
                        })}
                    />
                    <Route path="/auth" component={() => <p>sign-in form</p>} />
                </>
            ),
            '/sessions'
        );
        expect(await screen.findByText('secret page')).toBeTruthy();
        const before = sessionClient();
        const navigate = vi.spyOn(history, 'set');

        await Promise.all(
            Array.from({ length: 5 }, () => send(api.GET('/api/v1/sessions')))
        );

        expect(await screen.findByText('sign-in form')).toBeTruthy();
        const after = sessionClient();
        expect(after).not.toBe(before);
        await ticks();
        expect(sessionClient()).toBe(after);
        expect(otherTab.received).toEqual([{ type: 'signed-out' }]);
        expect(navigate).toHaveBeenCalledTimes(1);
        expect(made).toBe(1);
    });

    it('rebuilds the tree: local state starts over, outside it stays', async () => {
        fakeApi(meAs(() => anna));
        function Counter() {
            const [count, setCount] = createSignal(0);
            return (
                <button onClick={() => setCount(count() + 1)}>
                    count {count()}
                </button>
            );
        }
        renderPage(() => <Counter />);
        fireEvent.click(await screen.findByText('count 0'));
        expect(screen.getByText('count 1')).toBeTruthy();

        endSession();

        expect(await screen.findByText('count 0')).toBeTruthy();
    });
});

describe('endSession', () => {
    it('does nothing the second time', async () => {
        fakeApi(meAs(() => anna));
        const { otherTab } = renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('Anna'));

        endSession();
        const signedOut = sessionClient();
        endSession();

        expect(sessionClient()).toBe(signedOut);
        expect(otherTab.received).toEqual([{ type: 'signed-out' }]);
        expect(who()).toBe('nobody');
    });

    it('does nothing for a page loaded signed out', async () => {
        fakeApi(meAs(() => null));
        const { otherTab } = renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('nobody'));
        const loaded = sessionClient();

        endSession();

        expect(sessionClient()).toBe(loaded);
        expect(otherTab.received).toEqual([]);
    });

    it('ends the session when /auth/me answers null after a user, null already in the cache', async () => {
        let me: User | null = anna;
        fakeApi(meAs(() => me));
        const { otherTab } = renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('Anna'));
        const annas = sessionClient();

        me = null;
        await expect(
            annas.fetchQuery({ ...meQuery(), staleTime: 0 })
        ).resolves.toBeNull();

        await waitFor(() => expect(sessionClient()).not.toBe(annas));
        expect(who()).toBe('nobody');
        expect(otherTab.received).toEqual([{ type: 'signed-out' }]);
    });

    it('cancels and clears the old client', async () => {
        const slow = later();
        fakeApi({
            ...meAs(() => anna),
            'GET /api/v1/slow': () => slow.response,
        });
        renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('Anna'));
        const annas = sessionClient();
        let aborted = false;
        void annas
            .fetchQuery({
                queryKey: ['slow'],
                queryFn: ({ signal }) => {
                    signal.addEventListener('abort', () => (aborted = true));
                    return slow.response;
                },
            })
            .catch(() => undefined);

        endSession();

        expect(aborted).toBe(true);
        expect(annas.getQueryCache().getAll()).toHaveLength(0);
    });

    it('clears the CSRF token that /auth/me brought', async () => {
        fakeApi({
            'GET /api/v1/auth/me': () =>
                new Response(JSON.stringify(anna), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        [CsrfService.HEADER]: 'token-a',
                    },
                }),
            'GET /api/v1/roles/me': () => json(200, []),
        });
        renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('Anna'));
        expect(CsrfService.getToken()).toBe('token-a');

        endSession();

        expect(CsrfService.getToken()).toBeNull();
    });
});

describe('watchUser', () => {
    it('takes the first answer of a page load as the reference', async () => {
        fakeApi(meAs(() => anna));
        const told: (string | null)[] = [];
        const { otherTab } = renderPage(() => <Who />);
        onSessionChange((u) => told.push(u?.id ?? null));
        const loaded = sessionClient();

        await waitFor(() => expect(who()).toBe('Anna'));
        await ticks();

        expect(sessionClient()).toBe(loaded);
        expect(told).toEqual(['anna']);
        expect(otherTab.received).toEqual([]);
    });

    it('replaces the session for another user, after a microtask', async () => {
        fakeApi(meAs(() => anna));
        renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('Anna'));
        const annas = sessionClient();

        annas.setQueryData(authKeys.me(), boris);
        // Not from inside the update (a query of the tree being replaced).
        expect(sessionClient()).toBe(annas);

        await waitFor(() => expect(sessionClient()).not.toBe(annas));
        expect(sessionClient().getQueryData(authKeys.me())).toEqual(boris);
        expect(who()).toBe('Boris');
    });

    it('lets the query that brought another user finish without an error', async () => {
        let me: User | null = anna;
        fakeApi(meAs(() => me));
        renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('Anna'));
        const annas = sessionClient();

        me = boris;
        await expect(
            annas.fetchQuery({ ...meQuery(), staleTime: 0 })
        ).resolves.toEqual(boris);

        await waitFor(() => expect(who()).toBe('Boris'));
    });

    it('replaces a signed-out session when a user comes', async () => {
        fakeApi(meAs(() => null));
        renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('nobody'));
        const loaded = sessionClient();

        loaded.setQueryData(authKeys.me(), anna);

        await waitFor(() => expect(who()).toBe('Anna'));
        expect(sessionClient()).not.toBe(loaded);
    });

    it('does nothing for the same user', async () => {
        fakeApi(meAs(() => anna));
        renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('Anna'));
        const annas = sessionClient();

        annas.setQueryData(authKeys.me(), { ...anna, name: 'Anna K' });
        await ticks();

        expect(sessionClient()).toBe(annas);
        expect(who()).toBe('Anna K');
    });

    it("does nothing for an old session's client", async () => {
        fakeApi(meAs(() => anna));
        renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('Anna'));
        const annas = sessionClient();
        endSession();
        const signedOut = sessionClient();

        annas.setQueryData(authKeys.me(), boris);
        await ticks();

        expect(sessionClient()).toBe(signedOut);
        expect(who()).toBe('nobody');
    });
});

describe('the tabs', () => {
    it('signs out at a message, without asking the server or telling again', async () => {
        const api = fakeApi(meAs(() => anna));
        const { otherTab } = renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('Anna'));
        const asked = api.requests.length;

        otherTab.post({ type: 'signed-out' });
        expect(who()).toBe('nobody');
        const signedOut = sessionClient();
        otherTab.post({ type: 'signed-out' });

        expect(sessionClient()).toBe(signedOut);
        expect(otherTab.received).toEqual([]);
        expect(api.requests.length).toBe(asked);
    });

    it('asks /auth/me again at a sign-in, and keeps the session for the same user', async () => {
        let token = 'token-1';
        const api = fakeApi({
            'GET /api/v1/auth/me': () =>
                new Response(JSON.stringify(anna), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        [CsrfService.HEADER]: token,
                    },
                }),
            'GET /api/v1/roles/me': () => json(200, []),
        });
        const { otherTab } = renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('Anna'));
        const annas = sessionClient();

        token = 'token-2';
        otherTab.post({ type: 'signed-in' });

        await waitFor(() =>
            expect(api.calls('GET /api/v1/auth/me')).toHaveLength(2)
        );
        await waitFor(() => expect(CsrfService.getToken()).toBe('token-2'));
        await ticks();
        expect(sessionClient()).toBe(annas);
        expect(otherTab.received).toEqual([]);
    });

    it('replaces the session at a sign-in of another user', async () => {
        let me: User | null = anna;
        fakeApi(meAs(() => me));
        const { otherTab } = renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('Anna'));

        me = boris;
        otherTab.post({ type: 'signed-in' });

        await waitFor(() => expect(who()).toBe('Boris'));
        // Not told again: the other tab knows.
        expect(otherTab.received).toEqual([]);
    });

    it('replaces a signed-out session at a sign-in', async () => {
        let me: User | null = null;
        fakeApi(meAs(() => me));
        const { otherTab } = renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('nobody'));

        me = anna;
        otherTab.post({ type: 'signed-in' });

        await waitFor(() => expect(who()).toBe('Anna'));
    });

    it('is a stub without BroadcastChannel', () => {
        const tabs = openTabs(() => {}, undefined);
        expect(() => tabs.post({ type: 'signed-out' })).not.toThrow();
        expect(() => tabs.close()).not.toThrow();
    });

    it('goes through BroadcastChannel where there is one', () => {
        const made: FakeChannel[] = [];
        class FakeChannel {
            onmessage: ((event: MessageEvent<TabMessage>) => void) | null =
                null;
            posted: TabMessage[] = [];
            closed = false;
            constructor(readonly name: string) {
                made.push(this);
            }
            postMessage(message: TabMessage) {
                this.posted.push(message);
            }
            close() {
                this.closed = true;
            }
        }
        const got: TabMessage[] = [];
        const tabs = openTabs(
            (message) => got.push(message),
            FakeChannel as unknown as typeof BroadcastChannel
        );

        tabs.post({ type: 'signed-in' });
        made[0].onmessage?.(
            new MessageEvent('message', { data: { type: 'signed-out' } })
        );
        tabs.close();

        expect(made[0].name).toBe('echophase-session');
        expect(made[0].posted).toEqual([{ type: 'signed-in' }]);
        expect(got).toEqual([{ type: 'signed-out' }]);
        expect(made[0].closed).toBe(true);
    });
});

describe('sessionScoped', () => {
    it('makes a new value for each session, and stops its effects with it', async () => {
        fakeApi(meAs(() => anna));
        const [tick, setTick] = createSignal(0);
        let runs = 0;
        const state = sessionScoped(() => {
            createEffect(() => {
                tick();
                runs++;
            });
            return createSignal<string[]>([]);
        });
        function Recent() {
            return <p data-testid="recent">{state()[0]().join(',')}</p>;
        }
        renderPage(() => <Recent />);
        state()[1](['a']);
        await waitFor(() =>
            expect(screen.getByTestId('recent').textContent).toBe('a')
        );
        const first = state();
        await ticks();
        const before = runs;
        setTick(1);
        expect(runs).toBe(before + 1);

        endSession();
        const second = state();

        expect(second).not.toBe(first);
        expect(second[0]()).toEqual([]);
        expect(screen.getByTestId('recent').textContent).toBe('');
        // The first session's effect is gone; the second one's runs.
        await ticks();
        const now = runs;
        setTick(2);
        expect(runs).toBe(now + 1);
    });
});

describe('onSessionChange', () => {
    it('tells each known user once: page load, sign-in, sign-out', async () => {
        let me: User | null = anna;
        fakeApi(meAs(() => me));
        renderPage(() => <Who />);
        const told: (string | null)[] = [];
        onSessionChange((u) => told.push(u?.id ?? null));

        await waitFor(() => expect(who()).toBe('Anna'));
        sessionClient().setQueryData(authKeys.me(), { ...anna, name: 'A' });
        endSession();
        me = boris;
        startSession(boris, '/');
        await waitFor(() => expect(who()).toBe('Boris'));
        sessionClient().setQueryData(authKeys.me(), boris);
        await ticks();

        expect(told).toEqual(['anna', null, 'boris']);
    });
});

describe('sessionStore', () => {
    it('keeps records under user:<id>:<name>, apart for each user', async () => {
        fakeApi(meAs(() => anna));
        renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('Anna'));
        const draft = sessionStore<{ text: string }>('draft');

        draft.set({ text: "Anna's" });
        expect(localStorage.getItem('user:anna:draft')).toBe(
            JSON.stringify({ text: "Anna's" })
        );

        sessionClient().setQueryData(authKeys.me(), boris);
        await waitFor(() => expect(who()).toBe('Boris'));
        expect(draft.get()).toBeUndefined();
        draft.set({ text: "Boris's" });
        expect(localStorage.getItem('user:anna:draft')).toBe(
            JSON.stringify({ text: "Anna's" })
        );
        expect(draft.get()).toEqual({ text: "Boris's" });
    });

    it('reads and writes nothing while nobody is signed in', async () => {
        fakeApi(meAs(() => null));
        renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('nobody'));
        const draft = sessionStore<string>('draft');

        draft.set('x');

        expect(draft.get()).toBeUndefined();
        expect(localStorage.length).toBe(0);
    });

    it('forgets only the records of that user, in both storages', () => {
        localStorage.setItem('user:anna:draft', '1');
        sessionStorage.setItem('user:anna:tab', '2');
        localStorage.setItem('user:boris:draft', '3');
        localStorage.setItem('theme', 'dark');

        forgetStored('anna');

        expect(localStorage.getItem('user:anna:draft')).toBeNull();
        expect(sessionStorage.getItem('user:anna:tab')).toBeNull();
        expect(localStorage.getItem('user:boris:draft')).toBe('3');
        expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('keeps the records when the session ends by a 401 or another tab', async () => {
        fakeApi({
            ...meAs(() => anna),
            'GET /api/v1/sessions': () => json(401),
        });
        const { otherTab, unmount } = renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('Anna'));
        sessionStore<string>('draft').set('kept');

        await send(api.GET('/api/v1/sessions'));
        await waitFor(() => expect(who()).toBe('nobody'));
        expect(localStorage.getItem('user:anna:draft')).toBe('"kept"');
        unmount();

        const second = renderPage(() => <Who />);
        await waitFor(() => expect(who()).toBe('Anna'));
        second.otherTab.post({ type: 'signed-out' });
        expect(who()).toBe('nobody');
        expect(localStorage.getItem('user:anna:draft')).toBe('"kept"');
        expect(otherTab.received).toEqual([{ type: 'signed-out' }]);
    });
});
