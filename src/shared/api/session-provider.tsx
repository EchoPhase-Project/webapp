import {
    Show,
    createRoot,
    createSignal,
    getOwner,
    onCleanup,
    runWithOwner,
    untrack,
    type ParentComponent,
} from 'solid-js';
import {
    QueryClientProvider,
    type DefaultOptions,
    type QueryClient,
    type QueryKey,
} from '@tanstack/solid-query';
import { onUnauthorized, setRequestTagger } from './client';
import { CsrfService } from './csrf';
import { authKeys, isMeKey } from './auth-keys';
import { createAppQueryClient } from './query-client';
import type { User } from './types';

/**
 * One signed-in (or signed-out) stretch of the app: its own QueryClient, and
 * the tree under SessionProvider built for it. Signing in or out makes a new
 * one, so nothing of the previous user's survives: not the cache, not a
 * component's signals, not the socket.
 */
type Session = {
    client: QueryClient;
    /** Where the new tree starts (after sign-in: `next`); none: the current address. */
    start?: string;
    /** A Solid root of its own: what sessionScoped makes for this session is disposed with it. */
    root: { run: <T>(fn: () => T) => T; dispose: () => void };
    /** Signed out already (made by endSession, or /auth/me answered null): endSession has nothing to do. */
    signedOut: boolean;
};

/** What one tab tells the others (they share the cookies, not the cache). */
export type TabMessage = { type: 'signed-in' } | { type: 'signed-out' };

/** The channel to the other tabs of the app. */
export interface Tabs {
    post: (message: TabMessage) => void;
    close: () => void;
}

// The client options of every new session: the app's, or a test's (resetSession).
let clientOptions: DefaultOptions = {};

function newSession(me?: User | null, start?: string): Session {
    const client = createAppQueryClient(clientOptions);
    // undefined: unknown yet, the new tree asks /auth/me; null: signed out.
    if (me !== undefined) client.setQueryData(authKeys.me(), me);
    const root = createRoot((dispose) => {
        const owner = getOwner();
        return {
            dispose,
            run: <T,>(fn: () => T) => runWithOwner(owner, fn) as T,
        };
    });
    const next: Session = { client, start, root, signedOut: me === null };
    watchUser(next);
    return next;
}

const [session, setSession] = createSignal(newSession());

// The session now, for handlers and callbacks: they follow nothing.
const current = () => untrack(session);

/** The current session's client, for code outside the tree (401, the tab channel). */
export const sessionClient = () => current().client;

/** Where the current session's tree starts, if not at the current address. */
export const sessionStart = () => current().start;

function replace(next: Session) {
    const old = current();
    setSession(next); // the tree under SessionProvider is rebuilt with next.client
    old.root.dispose(); // memos and effects that sessionScoped made for it stop
    void old.client.cancelQueries();
    old.client.clear(); // nobody watches it any more: the old tree is gone
    // Known now (sign-in, sign-out): tell at once. Unknown (page load, another
    // tab): watchUser tells when the first answer comes.
    const me = next.client.getQueryData<User | null>(authKeys.me());
    if (me !== undefined) notifySessionChange(me);
}

/** Signed in (login, register): `next` is where the new tree starts. */
export function startSession(user: User, next: string) {
    replace(newSession(user, next));
    tabs.post({ type: 'signed-in' });
}

/**
 * Signed out (logout, a 401 of a signed-in call, /auth/me answering null,
 * another tab). Safe to call twice. Not "is me null?": watchUser calls this
 * right when null has come into the cache, and the session must still end.
 * `forget`: an explicit logout, which also forgets the user's stored records.
 */
export function endSession(
    options: { fromTab?: boolean; forget?: boolean } = {}
) {
    const ending = current();
    if (ending.signedOut) return;
    ending.signedOut = true;
    const user = ending.client.getQueryData<User | null>(authKeys.me());
    CsrfService.clearToken();
    if (options.forget && user) forgetStored(user.id);
    replace(newSession(null));
    if (!options.fromTab) tabs.post({ type: 'signed-out' });
}

// Each request remembers the session that sent it, marked as it enters the
// client (before the other middlewares, which are awaited): a request
// started right before a replace keeps its own session. The tagger lives
// here: client.ts is the lower layer and must not import this.
const sentBy = new WeakMap<Request, Session>();
setRequestTagger((request) => sentBy.set(request, current()));

// Only a 401 of a request this session sent ends it: a slow request of the
// previous user, answered after the next one signed in, is no news.
onUnauthorized((request) => {
    if (sentBy.get(request) === current()) endSession();
});

/**
 * Another user behind the same cookies (signed in in another tab while this
 * one slept): /auth/me now answers someone else, or someone at all after null,
 * or null after someone. The first known answer is the reference, also when
 * the session started unknown (page load). A subscription, not a check in
 * queryFn: replacing the session from inside a query of the tree being
 * replaced would pull the tree from under it.
 */
function watchUser(own: Session) {
    let known = own.client.getQueryData<User | null>(authKeys.me());
    const unsubscribe = own.client.getQueryCache().subscribe((event) => {
        if (
            event.type !== 'updated' ||
            !isMeKey(event.query.queryKey as QueryKey)
        )
            return;
        if (current() !== own) return; // an old session: nothing to do
        const now = event.query.state.data as User | null | undefined;
        if (now === undefined) return; // still loading, or an error
        if (known === undefined) {
            // The first answer: the reference. A page loaded signed out is a
            // signed-out session; onSessionChange learns who it is.
            known = now;
            own.signedOut = now === null;
            notifySessionChange(now);
            return;
        }
        if ((known?.id ?? null) === (now?.id ?? null)) return;
        queueMicrotask(() => {
            if (current() !== own) return;
            if (now) replace(newSession(now));
            else endSession();
        });
    });
    own.root.run(() => onCleanup(unsubscribe));
}

/** Everything that belongs to a user lives under this: rebuilt for each session. */
export const SessionProvider: ParentComponent = (props) => (
    <Show when={session()} keyed>
        {(s) => (
            <QueryClientProvider client={s.client}>
                {props.children}
            </QueryClientProvider>
        )}
    </Show>
);

/**
 * Module state that belongs to the signed-in user: made anew for each
 * session, so the next user never sees the previous one's. `make` runs in
 * the session's own root: its memos and effects stop with the session.
 */
export function sessionScoped<T>(make: () => T): () => T {
    const bySession = new WeakMap<Session, T>();
    return () => {
        const s = session(); // reactive: readers follow the session
        let value = bySession.get(s);
        if (value === undefined) {
            value = s.root.run(make);
            bySession.set(s, value);
        }
        return value;
    };
}

type SessionListener = (user: User | null) => void;
const sessionListeners = new Set<SessionListener>();
// The last user told: the same one twice in a row is no change.
let told: { user: User | null } | undefined;

/**
 * For what cannot be made anew per session (a library's global state):
 * called with the session's user as soon as it is known, null when signed
 * out. Returns an unsubscribe.
 */
export function onSessionChange(listener: SessionListener): () => void {
    sessionListeners.add(listener);
    return () => sessionListeners.delete(listener);
}

function notifySessionChange(user: User | null) {
    if (told && (told.user?.id ?? null) === (user?.id ?? null)) return;
    told = { user };
    sessionListeners.forEach((listener) => listener(user));
}

const storedPrefix = (userId: string) => `user:${userId}:`;

/**
 * A record in the browser's storage that belongs to the signed-in user:
 * the key is `user:<id>:<name>`, so one user never reads another's. Nothing
 * is read or written while nobody is signed in. An explicit logout forgets
 * the user's records; an expired session keeps them.
 */
export function sessionStore<T>(name: string, storage: Storage = localStorage) {
    const key = () => {
        const me = sessionClient().getQueryData<User | null>(authKeys.me());
        return me ? storedPrefix(me.id) + name : undefined;
    };
    return {
        get(): T | undefined {
            const at = key();
            const raw = at === undefined ? null : storage.getItem(at);
            if (raw === null) return undefined;
            try {
                return JSON.parse(raw) as T;
            } catch {
                return undefined;
            }
        },
        set(value: T) {
            const at = key();
            if (at !== undefined) storage.setItem(at, JSON.stringify(value));
        },
        remove() {
            const at = key();
            if (at !== undefined) storage.removeItem(at);
        },
    };
}

/** Removes every stored record of the user (sessionStore), in both storages. */
export function forgetStored(userId: string) {
    const prefix = storedPrefix(userId);
    for (const storage of [localStorage, sessionStorage]) {
        const keys: string[] = [];
        for (let i = 0; i < storage.length; i++) {
            const at = storage.key(i);
            if (at?.startsWith(prefix)) keys.push(at);
        }
        keys.forEach((at) => storage.removeItem(at));
    }
}

/**
 * The channel to the other tabs. A browser without BroadcastChannel gets a
 * stub: nothing goes out, and only refetching /auth/me (on focus) notices
 * a change.
 */
export function openTabs(
    receive: (message: TabMessage) => void,
    Channel: typeof BroadcastChannel | undefined = globalThis.BroadcastChannel
): Tabs {
    if (typeof Channel !== 'function') return { post() {}, close() {} };
    const channel = new Channel('echophase-session');
    channel.onmessage = (event: MessageEvent<TabMessage>) =>
        receive(event.data);
    return {
        post: (message) => channel.postMessage(message),
        close: () => channel.close(),
    };
}

// Another tab signed out: so did this one (the cookies are gone), without
// asking the server. Another tab signed in: ask /auth/me again, and let
// watchUser decide (the same user: nothing; another one: a new session).
// The answer brings this tab a CSRF token of its own too.
function fromTab(message: TabMessage) {
    if (message.type === 'signed-out') endSession({ fromTab: true });
    else if (message.type === 'signed-in')
        void sessionClient().invalidateQueries({
            queryKey: authKeys.me(),
            refetchType: 'all',
        });
}

let tabs = openTabs(fromTab);

/**
 * Tests only: a new session with a client of `options` (the previous one
 * disposed), no listeners, and a pair of tabs instead of BroadcastChannel.
 * `otherTab.post` delivers to this tab; `otherTab.received` is what this tab
 * posted.
 */
export function resetSession(options: DefaultOptions = {}) {
    const old = current();
    old.root.dispose();
    void old.client.cancelQueries();
    old.client.clear();
    clientOptions = options;
    sessionListeners.clear();
    told = undefined;
    tabs.close();
    const received: TabMessage[] = [];
    tabs = { post: (message) => void received.push(message), close() {} };
    setSession(newSession());
    return { otherTab: { received, post: fromTab } };
}
