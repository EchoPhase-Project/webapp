// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@solidjs/testing-library';
import { fakeApi, json, user } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { expectNoA11yViolations } from '@shared/testing/axe';
import { FakeSocket } from './fixtures';
import { RealtimeProvider } from './realtime-provider';
import RealtimeNotices from './RealtimeNotices';

beforeEach(() => {
    FakeSocket.made = [];
    vi.stubGlobal('WebSocket', FakeSocket);
});

/** The notices under a provider whose socket the test drives. */
async function renderNotices() {
    fakeApi({
        'GET /api/v1/auth/me': () => json(200, user()),
        'GET /api/v1/roles/me': () => json(200, []),
        'GET /api/v1/gateway/intents': () =>
            json(200, [{ name: 'connections', allowed: true }]),
    });
    renderPage(() => (
        <RealtimeProvider>
            <RealtimeNotices />
        </RealtimeProvider>
    ));
    await waitFor(() => expect(FakeSocket.made).toHaveLength(1));
    const socket = FakeSocket.made[0];
    socket.open();
    return socket;
}

const region = () => screen.getByRole('status');
const titles = () =>
    [...region().querySelectorAll('strong')].map((t) => t.textContent);

describe('RealtimeNotices', () => {
    it('shows what the server says, in a live region that is always there', async () => {
        const socket = await renderNotices();
        // Empty, but on the page: a region that comes with its first
        // message is not announced.
        expect(region().children).toHaveLength(0);

        socket.deliver({
            type: 'connection.reauth_required',
            connection: { name: 'Main bot', provider: 'discord' },
        });
        socket.deliver({
            type: 'discord_gateway.failed',
            gateway: { connection: 'Main bot', message: 'Invalid token' },
        });

        expect(titles()).toEqual([
            'Connection needs attention',
            'Discord gateway stopped (Main bot)',
        ]);
        expect(region().textContent).toContain('discord "Main bot"');
        expect(region().textContent).toContain('Invalid token');
        await expectNoA11yViolations();
    });

    it('keeps the newest five, and a notice goes when dismissed', async () => {
        const socket = await renderNotices();
        for (let i = 1; i <= 6; i++)
            socket.deliver({
                type: 'discord_gateway.failed',
                gateway: { connection: `bot ${i}`, message: '' },
            });
        expect(titles()).toEqual(
            [2, 3, 4, 5, 6].map((i) => `Discord gateway stopped (bot ${i})`)
        );

        const [first] = within(region()).getAllByRole('button', {
            name: 'Dismiss',
        });
        fireEvent.click(first);
        expect(titles()).toHaveLength(4);
        expect(titles()[0]).toBe('Discord gateway stopped (bot 3)');
    });
});
