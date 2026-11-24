// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@solidjs/testing-library';
import { authKeys } from '@shared/api/auth';
import { endSession, sessionClient } from '@shared/api/session-provider';
import { fakeApi, json, user } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { gatewayKeys } from './api';
import {
    RealtimeProvider,
    useRealtime,
    useRealtimeEvent,
} from './realtime-provider';
import { FakeSocket } from './fixtures';
import { Op } from './types';

const intents = [
    { name: 'blocks', allowed: true },
    { name: 'connections', allowed: false },
    { name: 'notifications', allowed: true },
];

const page = () => (
    <RealtimeProvider>
        <p>app</p>
    </RealtimeProvider>
);

/** Catches the reconnect timer instead of waiting for it. */
function catchRetry() {
    const timers: (() => unknown)[] = [];
    const real = window.setTimeout.bind(window);
    vi.spyOn(window, 'setTimeout').mockImplementation(((
        handler: () => unknown,
        delay?: number
    ) => {
        if ((delay ?? 0) >= 1000) {
            timers.push(handler);
            return 0;
        }
        return real(handler, delay);
    }) as typeof window.setTimeout);
    return timers;
}

beforeEach(() => {
    FakeSocket.made = [];
    vi.stubGlobal('WebSocket', FakeSocket);
});

afterEach(() => {
    vi.restoreAllMocks();
});

const signedIn = {
    'GET /api/v1/auth/me': () => json(200, user()),
    'GET /api/v1/roles/me': () => json(200, []),
    'GET /api/v1/gateway/intents': () => json(200, intents),
};

describe('RealtimeProvider', () => {
    it('opens on the handshake ack, pings at half the interval, and hands each event to its handlers', async () => {
        fakeApi(signedIn);
        const interval = vi.spyOn(window, 'setInterval');
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const seen: string[] = [];
        const Probe = () => {
            const { status, intents: allowed } = useRealtime();
            // The first handler throws: the others still get the event.
            useRealtimeEvent('note.shared', () => {
                throw new Error('handler bug');
            });
            useRealtimeEvent('note.shared', (e) =>
                seen.push(`type ${String(e.id)}`)
            );
            useRealtimeEvent('*', (e) => seen.push(`any ${e.type}`));
            return (
                <p data-testid="probe">
                    {status()} {allowed().join(',')}
                </p>
            );
        };
        const { getByTestId } = renderPage(() => (
            <RealtimeProvider>
                <Probe />
            </RealtimeProvider>
        ));
        await waitFor(() => expect(FakeSocket.made).toHaveLength(1));
        const socket = FakeSocket.made[0];
        socket.open();

        socket.deliver({
            op: Op.HandshakeAck,
            d: {
                intents: ['blocks', 'notifications'],
                heartbeatInterval: 2000,
            },
        });
        expect(getByTestId('probe').textContent).toBe(
            'open blocks,notifications'
        );
        expect(interval).toHaveBeenCalledWith(expect.any(Function), 1000);

        socket.deliver({ type: 'note.shared', id: 7 });
        socket.deliver({ type: 'run.started' });
        expect(seen).toEqual(['type 7', 'any note.shared', 'any run.started']);
        expect(error).toHaveBeenCalledOnce();

        // Not JSON, and an event without a type: nothing happens.
        socket.deliver('not json');
        socket.deliver({ id: 8 });
        expect(seen).toHaveLength(3);

        socket.deliver({ op: Op.Error, d: { message: 'unknown intent' } });
        expect(warn).toHaveBeenCalledWith(
            'Realtime gateway error:',
            'unknown intent'
        );
        expect(getByTestId('probe').textContent).toBe(
            'open blocks,notifications'
        );
    });

    it("opens for a signed-in user, with the intents from the session's cache", async () => {
        fakeApi({
            'GET /api/v1/auth/me': () => json(200, user()),
            'GET /api/v1/roles/me': () => json(200, []),
            'GET /api/v1/gateway/intents': () => json(200, intents),
        });
        renderPage(page);

        await waitFor(() => expect(FakeSocket.made).toHaveLength(1));
        FakeSocket.made[0].open();

        expect(FakeSocket.made[0].sent[0]).toEqual({
            op: Op.Handshake,
            d: { intents: ['blocks', 'notifications'] },
        });
        // Through fetchQuery: the answer is in the session's cache.
        expect(sessionClient().getQueryData(gatewayKeys.intents())).toEqual(
            intents
        );
    });

    it('does not open without a user', async () => {
        const server = fakeApi({ 'GET /api/v1/auth/me': () => json(401) });
        renderPage(page);

        await waitFor(() =>
            expect(server.calls('GET /api/v1/auth/me')).toHaveLength(1)
        );
        await new Promise((done) => setTimeout(done, 10));
        expect(FakeSocket.made).toHaveLength(0);
        expect(server.calls('GET /api/v1/gateway/intents')).toHaveLength(0);
    });

    it('closes the socket when the session ends', async () => {
        fakeApi({
            'GET /api/v1/auth/me': () => json(200, user()),
            'GET /api/v1/roles/me': () => json(200, []),
            'GET /api/v1/gateway/intents': () => json(200, intents),
        });
        renderPage(page);
        await waitFor(() => expect(FakeSocket.made).toHaveLength(1));
        FakeSocket.made[0].open();

        endSession();

        expect(FakeSocket.made[0].closedWith).toBe(1000);
        await new Promise((done) => setTimeout(done, 10));
        expect(FakeSocket.made).toHaveLength(1);
    });

    it('asks /auth/me through the cache before reconnecting, and connects again', async () => {
        const server = fakeApi({
            'GET /api/v1/auth/me': () => json(200, user()),
            'GET /api/v1/roles/me': () => json(200, []),
            'GET /api/v1/gateway/intents': () => json(200, intents),
        });
        renderPage(page);
        await waitFor(() => expect(FakeSocket.made).toHaveLength(1));
        FakeSocket.made[0].open();
        const updates = () =>
            sessionClient().getQueryState(authKeys.me())?.dataUpdateCount ?? 0;
        const before = updates();
        const retries = catchRetry();

        FakeSocket.made[0].drop();
        expect(retries).toHaveLength(1);
        void retries[0]();

        await waitFor(() => expect(FakeSocket.made).toHaveLength(2));
        expect(server.calls('GET /api/v1/auth/me')).toHaveLength(2);
        expect(updates()).toBe(before + 1);
    });

    it('ends the session when /auth/me answers 401 before reconnecting', async () => {
        let signedIn = true;
        fakeApi({
            'GET /api/v1/auth/me': () =>
                signedIn ? json(200, user()) : json(401),
            'GET /api/v1/roles/me': () => json(200, []),
            'GET /api/v1/gateway/intents': () => json(200, intents),
        });
        const { otherTab } = renderPage(page);
        await waitFor(() => expect(FakeSocket.made).toHaveLength(1));
        FakeSocket.made[0].open();
        const before = sessionClient();
        const retries = catchRetry();

        FakeSocket.made[0].drop();
        signedIn = false;
        void retries[0]();

        // A 401 of /auth/me is no 401 for the client: watchUser saw null.
        await waitFor(() => expect(sessionClient()).not.toBe(before));
        expect(sessionClient().getQueryData(authKeys.me())).toBeNull();
        expect(otherTab.received).toEqual([{ type: 'signed-out' }]);
        await new Promise((done) => setTimeout(done, 10));
        expect(FakeSocket.made).toHaveLength(1);
    });
});
