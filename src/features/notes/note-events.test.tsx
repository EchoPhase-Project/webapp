// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@solidjs/testing-library';
import { sessionClient } from '@shared/api/session-provider';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import {
    followNoteEvents,
    notificationKindOf,
    type NoteEventFeed,
} from './note-events';
import NotesPage from './NotesPage';

const note = (id: string, title: string) => ({
    id,
    title,
    body: '',
    pinned: false,
    remindAt: null,
    access: 'Owner',
    owner: { id: 'u1', userName: 'dusty', name: 'Dusty' },
    stamp: 's1',
    createdAt: '2026-10-25T10:00:00Z',
    updatedAt: '2026-10-25T10:00:00Z',
});

function feed() {
    const handlers = new Map<string, (e: { [key: string]: unknown }) => void>();
    const value: NoteEventFeed = {
        subscribe: (type, handler) => {
            handlers.set(type, handler);
            return () => handlers.delete(type);
        },
    };
    return {
        value,
        emit: (type: string, e: { [key: string]: unknown } = {}) =>
            handlers.get(type)?.({ type, ...e }),
    };
}

/** An open notes page whose server list grows with `share()`. */
async function openList() {
    let notes = [note('n1', 'Groceries')];
    const api = fakeApi({
        ...signedIn,
        'GET /api/v1/notes': () => json(200, notes),
    });
    renderPage(() => <NotesPage />);
    await screen.findByText('Groceries');
    const { value, emit } = feed();
    followNoteEvents(value, sessionClient());
    return {
        api,
        emit,
        share: () => (notes = [note('n2', 'Plan'), ...notes]),
        lists: () => api.calls('GET /api/v1/notes').length,
    };
}

describe('notificationKindOf', () => {
    it('reads a string kind, and nothing else', () => {
        expect(
            notificationKindOf({ notification: { kind: 'note_shared' } })
        ).toBe('note_shared');
        expect(
            notificationKindOf({ notification: { kind: 3 } })
        ).toBeUndefined();
        expect(notificationKindOf({ notification: null })).toBeUndefined();
        expect(notificationKindOf({})).toBeUndefined();
    });
});

describe('followNoteEvents', () => {
    afterEach(() => {
        sessionStorage.clear();
    });

    it('asks an open notes list again once when a note is shared', async () => {
        const { emit, share, lists } = await openList();

        share();
        emit('notification.created', { notification: { kind: 'note_shared' } });

        expect(await screen.findByText('Plan')).toBeTruthy();
        expect(lists()).toBe(2);
    });

    it('leaves the list alone for another kind of notification', async () => {
        const { emit, lists } = await openList();

        emit('notification.created', { notification: { kind: 'run_failed' } });

        await new Promise((r) => setTimeout(r, 20));
        expect(lists()).toBe(1);
    });

    it('asks again for an event of an unknown shape', async () => {
        const { emit, lists } = await openList();

        emit('notification.created', { note: 'renamed' });

        await waitFor(() => expect(lists()).toBe(2));
    });
});
