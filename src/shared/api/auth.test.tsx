// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import type { QueryKey } from '@tanstack/solid-query';
import { fakeApi, json, user } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import {
    authKeys,
    loginMutation,
    logoutMutation,
    meQuery,
    useAuth,
    useResultMutation,
} from './auth';
import { ApiError } from './client';
import { CsrfService } from './csrf';
import {
    onSessionChange,
    sessionClient,
    sessionStore,
} from './session-provider';
import { isMeKey } from './auth-keys';
import type { User } from './types';

const anna = user({ id: 'anna', name: 'Anna' }) as User;

/** The three states of useAuth, as text. */
function State() {
    const auth = useAuth();
    const state = () => {
        if (auth.authError()) return 'error';
        const me = auth.user();
        if (me === undefined) return 'loading';
        return me === null ? 'signed out' : me.name;
    };
    return <p data-testid="state">{state()}</p>;
}

const state = () => screen.getByTestId('state').textContent;

afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
});

describe('useAuth', () => {
    it('is loading (undefined) until /auth/me answers', async () => {
        const server = fakeApi({
            'GET /api/v1/auth/me': () => new Promise<Response>(() => {}),
        });
        renderPage(() => <State />);
        await waitFor(() =>
            expect(server.calls('GET /api/v1/auth/me')).toHaveLength(1)
        );
        expect(state()).toBe('loading');
    });

    it('is signed out (null) only for a 401', async () => {
        fakeApi({ 'GET /api/v1/auth/me': () => json(401) });
        renderPage(() => <State />);
        await waitFor(() => expect(state()).toBe('signed out'));
    });

    it('is an error, not signed out, for a 5xx or no answer', async () => {
        for (const answer of [
            () => json(503, { code: 'Down', message: 'down' }),
            () => Promise.reject(new TypeError('Failed to fetch')),
        ]) {
            fakeApi({ 'GET /api/v1/auth/me': answer });
            const { unmount } = renderPage(() => <State />);
            await waitFor(() => expect(state()).toBe('error'));
            expect(sessionClient().getQueryData(authKeys.me())).toBeUndefined();
            unmount();
        }
    });

    it('asks for the roles only once someone is signed in', async () => {
        const guest = fakeApi({
            'GET /api/v1/auth/me': () => json(401),
            'GET /api/v1/roles/me': () => json(200, []),
        });
        const first = renderPage(() => <State />);
        await waitFor(() => expect(state()).toBe('signed out'));
        await new Promise((done) => setTimeout(done, 10));
        expect(guest.calls('GET /api/v1/roles/me')).toHaveLength(0);
        first.unmount();

        const member = fakeApi({
            'GET /api/v1/auth/me': () => json(200, anna),
            'GET /api/v1/roles/me': () => json(200, ['admin']),
        });
        renderPage(() => <State />);
        await waitFor(() =>
            expect(member.calls('GET /api/v1/roles/me')).toHaveLength(1)
        );
        expect(sessionClient().getQueryData(authKeys.roles())).toEqual([
            'admin',
        ]);
    });
});

describe('meQuery', () => {
    it('turns only a 401 into null', async () => {
        renderPage(() => <p />);
        fakeApi({ 'GET /api/v1/auth/me': () => json(401) });
        await expect(sessionClient().fetchQuery(meQuery())).resolves.toBe(null);

        for (const answer of [
            () => json(500),
            () => json(403, { code: 'Forbidden', message: 'no' }),
            () => Promise.reject(new TypeError('Failed to fetch')),
        ]) {
            fakeApi({ 'GET /api/v1/auth/me': answer });
            await expect(
                sessionClient().fetchQuery({ ...meQuery(), staleTime: 0 })
            ).rejects.toBeInstanceOf(ApiError);
        }
    });
});

describe('loginMutation', () => {
    function Login() {
        const login = useResultMutation(loginMutation);
        return (
            <button
                onClick={() =>
                    void login({
                        credentials: { username: 'anna', password: 'pw' },
                        next: '/notes',
                    })
                }
            >
                log in
            </button>
        );
    }

    it('starts one new session at next, tells the other tabs, and leaves the old cache alone', async () => {
        let signedIn = false;
        fakeApi({
            'GET /api/v1/auth/me': () =>
                signedIn ? json(200, anna) : json(401),
            'GET /api/v1/roles/me': () => json(200, []),
            'POST /api/v1/auth/login': () => {
                signedIn = true;
                return new Response(null, { status: 204 });
            },
        });
        const { history, otherTab } = renderPage(
            () => (
                <>
                    <State />
                    <Login />
                </>
            ),
            '/auth'
        );
        await waitFor(() => expect(state()).toBe('signed out'));
        const old = sessionClient();
        const oldMe: unknown[] = [];
        old.getQueryCache().subscribe((event) => {
            if (
                event.type === 'updated' &&
                isMeKey(event.query.queryKey as QueryKey)
            )
                oldMe.push(event.query.state.data);
        });
        const told: (string | null)[] = [];
        onSessionChange((u) => told.push(u?.id ?? null));

        fireEvent.click(screen.getByText('log in'));

        await waitFor(() => expect(state()).toBe('Anna'));
        await new Promise((done) => setTimeout(done, 10));
        expect(told).toEqual(['anna']);
        expect(otherTab.received).toEqual([{ type: 'signed-in' }]);
        expect(oldMe).toEqual([]);
        expect(sessionClient()).not.toBe(old);
        expect(history.get()).toBe('/notes');
    });

    it('keeps the session when the sign-in is refused', async () => {
        const server = fakeApi({
            'GET /api/v1/auth/me': () => json(401),
            'POST /api/v1/auth/login': () =>
                json(401, { code: 'BadLogin', message: 'Wrong.' }),
        });
        const { history, otherTab } = renderPage(
            () => (
                <>
                    <State />
                    <Login />
                </>
            ),
            '/auth'
        );
        await waitFor(() => expect(state()).toBe('signed out'));
        const old = sessionClient();

        fireEvent.click(screen.getByText('log in'));

        await waitFor(() =>
            expect(server.calls('POST /api/v1/auth/login')).toHaveLength(1)
        );
        await new Promise((done) => setTimeout(done, 10));
        expect(sessionClient()).toBe(old);
        expect(otherTab.received).toEqual([]);
        expect(history.get()).toBe('/auth');
    });
});

describe('logoutMutation', () => {
    function Logout() {
        const logout = useResultMutation(logoutMutation);
        return <button onClick={() => void logout()}>log out</button>;
    }

    const signedInAs = (token: string) => ({
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

    it('signs out, clears the CSRF token and forgets the stored records', async () => {
        const server = fakeApi({
            ...signedInAs('token-a'),
            'DELETE /api/v1/sessions/current': () =>
                new Response(null, { status: 204 }),
        });
        const { otherTab } = renderPage(() => (
            <>
                <State />
                <Logout />
            </>
        ));
        await waitFor(() => expect(state()).toBe('Anna'));
        sessionStore<string>('draft').set('mine');
        localStorage.setItem('user:boris:draft', 'not mine');
        expect(CsrfService.getToken()).toBe('token-a');

        fireEvent.click(screen.getByText('log out'));

        await waitFor(() => expect(state()).toBe('signed out'));
        expect(server.calls('DELETE /api/v1/sessions/current')).toHaveLength(1);
        expect(CsrfService.getToken()).toBeNull();
        expect(localStorage.getItem('user:anna:draft')).toBeNull();
        expect(localStorage.getItem('user:boris:draft')).toBe('not mine');
        expect(otherTab.received).toEqual([{ type: 'signed-out' }]);
    });

    it('signs out even when the call fails', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        fakeApi({
            ...signedInAs('token-a'),
            'DELETE /api/v1/sessions/current': () =>
                json(500, { code: 'Boom', message: 'boom' }),
        });
        renderPage(() => (
            <>
                <State />
                <Logout />
            </>
        ));
        await waitFor(() => expect(state()).toBe('Anna'));

        fireEvent.click(screen.getByText('log out'));

        await waitFor(() => expect(state()).toBe('signed out'));
        expect(CsrfService.getToken()).toBeNull();
        expect(error).toHaveBeenCalled();
        error.mockRestore();
    });
});
