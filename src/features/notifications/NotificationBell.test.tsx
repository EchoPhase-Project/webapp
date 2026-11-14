// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import NotificationBell, { type NotificationFeed } from './NotificationBell';

const INBOX = 'GET /api/v1/notifications';

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
    const [status, setStatus] = createSignal('open');
    const value: NotificationFeed = {
        subscribe: (type, handler) => {
            handlers.set(type, handler);
            return () => handlers.delete(type);
        },
        status,
    };
    return {
        value,
        setStatus,
        emit: (type: string, e: { [key: string]: unknown }) =>
            handlers.get(type)?.({ type, ...e }),
    };
}

const created = (over: Record<string, unknown> = {}) => ({
    notification: item(over),
});

async function openBell(name: string) {
    fireEvent.click(await screen.findByRole('button', { name }));
}

const titles = () =>
    Array.from(document.querySelectorAll('.notification-title')).map(
        (e) => e.textContent
    );

describe('NotificationBell', () => {
    afterEach(() => {
        sessionStorage.clear();
        vi.restoreAllMocks();
    });

    it('shows the unread count, words known kinds, merges live ones in with no request', async () => {
        const api = fakeApi({
            ...signedIn,
            [INBOX]: () =>
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

        await openBell('Notifications (1 unread)');
        expect(screen.getByText('Build done')).toBeTruthy();
        expect(
            screen.getByText('Your files take 92% of your storage')
        ).toBeTruthy();

        emit('notification.created', created({ id: 'a3', title: 'Deployed' }));

        expect(
            await screen.findByText('Deployed', {
                selector: '.notification-title',
            })
        ).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Notifications (2 unread)' })
        ).toBeTruthy();
        // Announced to screen readers.
        expect(
            document.querySelector('[aria-live="polite"]')?.textContent
        ).toBe('Deployed');
        expect(titles()[0]).toBe('Deployed');
        expect(api.calls(INBOX)).toHaveLength(1);
    });

    it('does not add a notification it holds already', async () => {
        const api = fakeApi({
            ...signedIn,
            [INBOX]: () => json(200, { items: [item()], unread: 1 }),
        });
        const { value, emit } = feed();
        renderPage(() => <NotificationBell feed={value} />);
        await openBell('Notifications (1 unread)');

        emit('notification.created', created());

        expect(titles()).toEqual(['Build done']);
        expect(
            screen.getByRole('button', { name: 'Notifications (1 unread)' })
        ).toBeTruthy();
        expect(api.calls(INBOX)).toHaveLength(1);
    });

    it('keeps the newest 50', async () => {
        const items = Array.from({ length: 50 }, (_, i) =>
            item({ id: `n${i}`, title: `Old ${i}`, read: true })
        );
        fakeApi({
            ...signedIn,
            [INBOX]: () => json(200, { items, unread: 0 }),
        });
        const { value, emit } = feed();
        renderPage(() => <NotificationBell feed={value} />);
        await openBell('Notifications');
        await waitFor(() => expect(titles()).toHaveLength(50));

        emit('notification.created', created({ id: 'new', title: 'New' }));

        await waitFor(() => expect(titles()[0]).toBe('New'));
        expect(titles()).toHaveLength(50);
        expect(titles()).not.toContain('Old 49');
        expect(
            screen.getByRole('button', { name: 'Notifications (1 unread)' })
        ).toBeTruthy();
    });

    it('leaves an event before the first load to that load', async () => {
        let answer: (r: Response) => void = () => {};
        const api = fakeApi({
            ...signedIn,
            [INBOX]: () => new Promise<Response>((r) => (answer = r)),
        });
        const { value, emit } = feed();
        renderPage(() => <NotificationBell feed={value} />);
        await waitFor(() => expect(api.calls(INBOX)).toHaveLength(1));

        emit('notification.created', created({ id: 'a3', title: 'Deployed' }));
        answer(
            json(200, {
                items: [item({ id: 'a3', title: 'Deployed' })],
                unread: 1,
            })
        );

        await openBell('Notifications (1 unread)');
        expect(titles()).toEqual(['Deployed']);
        expect(api.calls(INBOX)).toHaveLength(1);
    });

    it('fetches the inbox for an event of an unknown shape, and warns', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        let items = [item()];
        const api = fakeApi({
            ...signedIn,
            [INBOX]: () => json(200, { items, unread: items.length }),
        });
        const { value, emit } = feed();
        renderPage(() => <NotificationBell feed={value} />);
        await openBell('Notifications (1 unread)');

        items = [item({ id: 'a3', title: 'From the server' }), item()];
        emit('notification.created', {
            notification: { id: 3, heading: 'Renamed field' },
        });

        expect(await screen.findByText('From the server')).toBeTruthy();
        expect(screen.queryByText('Renamed field')).toBeNull();
        expect(api.calls(INBOX)).toHaveLength(2);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0]).toContain('notification.created');
    });

    it('checks the inbox with the server when the feed opens again', async () => {
        const api = fakeApi({
            ...signedIn,
            [INBOX]: () => json(200, { items: [item()], unread: 1 }),
        });
        const { value, setStatus } = feed();
        renderPage(() => <NotificationBell feed={value} />);
        await screen.findByRole('button', { name: 'Notifications (1 unread)' });
        expect(api.calls(INBOX)).toHaveLength(1);

        setStatus('reconnecting');
        expect(api.calls(INBOX)).toHaveLength(1);
        setStatus('open');

        await waitFor(() => expect(api.calls(INBOX)).toHaveLength(2));
    });

    it('marks one read at once, with no request for the inbox', async () => {
        let answer: (r: Response) => void = () => {};
        const api = fakeApi({
            ...signedIn,
            [INBOX]: () => json(200, { items: [item()], unread: 1 }),
            'POST /api/v1/notifications/a1/read': () =>
                new Promise<Response>((r) => (answer = r)),
        });
        renderPage(() => <NotificationBell feed={feed().value} />);
        await openBell('Notifications (1 unread)');

        fireEvent.click(screen.getByText('Build done'));

        expect(
            await screen.findByRole('button', { name: 'Notifications' })
        ).toBeTruthy();
        answer(json(204));
        await waitFor(() =>
            expect(
                api.calls('POST /api/v1/notifications/a1/read')
            ).toHaveLength(1)
        );
        expect(api.calls(INBOX)).toHaveLength(1);
    });

    it('puts a notification back when marking it read fails', async () => {
        const api = fakeApi({
            ...signedIn,
            [INBOX]: () => json(200, { items: [item()], unread: 1 }),
            'POST /api/v1/notifications/a1/read': () =>
                json(500, { code: 'TestBroken', message: 'Try later.' }),
        });
        renderPage(() => <NotificationBell feed={feed().value} />);
        await openBell('Notifications (1 unread)');

        fireEvent.click(screen.getByText('Build done'));

        expect((await screen.findByRole('alert')).textContent).toBe(
            'Try later.'
        );
        expect(
            await screen.findByRole('button', {
                name: 'Notifications (1 unread)',
            })
        ).toBeTruthy();
        expect(api.calls(INBOX)).toHaveLength(2);
    });

    it('marks all read', async () => {
        let unread = 1;
        const api = fakeApi({
            ...signedIn,
            [INBOX]: () =>
                json(200, { items: [item({ read: unread === 0 })], unread }),
            'POST /api/v1/notifications/read': () => {
                unread = 0;
                return json(204);
            },
        });

        renderPage(() => <NotificationBell feed={feed().value} />);
        await openBell('Notifications (1 unread)');
        fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }));

        expect(
            await screen.findByRole('button', { name: 'Notifications' })
        ).toBeTruthy();
        expect(api.calls('POST /api/v1/notifications/read')).toHaveLength(1);
        expect(api.calls(INBOX)).toHaveLength(2);
    });

    it('deletes one', async () => {
        let items = [item(), item({ id: 'a2', title: 'Other', read: true })];
        const api = fakeApi({
            ...signedIn,
            [INBOX]: () =>
                json(200, {
                    items,
                    unread: items.filter((i) => !i.read).length,
                }),
            'DELETE /api/v1/notifications/a1': () => {
                items = items.filter((i) => i.id !== 'a1');
                return json(204);
            },
        });

        renderPage(() => <NotificationBell feed={feed().value} />);
        await openBell('Notifications (1 unread)');
        fireEvent.click(
            screen.getAllByRole('button', { name: 'Delete notification' })[0]
        );

        await waitFor(() => expect(titles()).toEqual(['Other']));
        expect(
            screen.getByRole('button', { name: 'Notifications' })
        ).toBeTruthy();
        expect(api.calls('DELETE /api/v1/notifications/a1')).toHaveLength(1);
    });

    it('asks nothing while nobody is signed in', async () => {
        const api = fakeApi({
            'GET /api/v1/auth/me': () => json(401),
            [INBOX]: () => json(200, { items: [], unread: 0 }),
        });
        const { value, setStatus } = feed();
        renderPage(() => <NotificationBell feed={value} />);
        await waitFor(() =>
            expect(api.calls('GET /api/v1/auth/me')).toHaveLength(1)
        );
        setStatus('reconnecting');
        setStatus('open');
        await new Promise((r) => setTimeout(r, 20));

        expect(api.calls(INBOX)).toHaveLength(0);
        expect(screen.queryByRole('button')).toBeNull();
    });
});
