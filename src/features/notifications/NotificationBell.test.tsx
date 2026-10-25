// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import NotificationBell, { type NotificationFeed } from './NotificationBell';

const item = (over: Record<string, unknown> = {}) => ({
    id: 'a1',
    kind: 'workflow',
    title: 'Build done',
    body: '',
    link: null,
    params: {},
    read: false,
    createdAt: '2026-10-25T10:00:00Z',
    ...over,
});

function feed() {
    const handlers = new Map<string, (e: { [key: string]: unknown }) => void>();
    const value: NotificationFeed = {
        subscribe: (type, handler) => {
            handlers.set(type, handler);
            return () => handlers.delete(type);
        },
        status: () => 'open',
    };
    return {
        value,
        emit: (type: string, e: { [key: string]: unknown }) =>
            handlers.get(type)?.(e),
    };
}

describe('NotificationBell', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        sessionStorage.clear();
    });

    it('shows the unread count, words known kinds, adds live ones', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/notifications': () =>
                json(200, {
                    items: [
                        item(),
                        item({
                            id: 'a2',
                            kind: 'storage_quota',
                            title: 'server words',
                            params: { percent: '92' },
                            read: true,
                        }),
                    ],
                    unread: 1,
                }),
        });
        const { value, emit } = feed();

        renderPage(() => <NotificationBell feed={value} />);

        const bell = await screen.findByRole('button', {
            name: 'Notifications (1 unread)',
        });
        fireEvent.click(bell);
        expect(screen.getByText('Build done')).toBeTruthy();
        expect(
            screen.getByText('Your files take 92% of your storage')
        ).toBeTruthy();

        emit('notification.created', {
            notification: item({ id: 'a3', title: 'Deployed' }),
        });

        expect(
            await screen.findByText('Deployed', {
                selector: '.notification-title',
            })
        ).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Notifications (2 unread)' })
        ).toBeTruthy();
    });

    it('marks all read', async () => {
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/notifications': () =>
                json(200, { items: [item()], unread: 1 }),
            'POST /api/v1/notifications/read': () => json(204),
        });

        renderPage(() => <NotificationBell feed={feed().value} />);
        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Notifications (1 unread)',
            })
        );
        fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }));

        await waitFor(() =>
            expect(api.calls('POST /api/v1/notifications/read')).toHaveLength(1)
        );
        expect(
            screen.getByRole('button', { name: 'Notifications' })
        ).toBeTruthy();
    });
});
