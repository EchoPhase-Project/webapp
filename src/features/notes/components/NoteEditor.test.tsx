// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import type { Note } from '@shared/api/types';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { expectNoA11yViolations } from '@shared/testing/axe';
import NoteEditor from './NoteEditor';

const note = (over: Partial<Note> = {}): Note => ({
    id: 'n1',
    title: 'Groceries',
    body: '- milk',
    pinned: false,
    remindAt: null,
    access: 'Owner',
    owner: { id: 'u1', userName: 'dusty', name: 'Dusty' },
    stamp: 's1',
    createdAt: '2026-10-25T10:00:00Z',
    updatedAt: '2026-10-25T10:00:00Z',
    ...over,
});

describe('NoteEditor', () => {
    it('saves with Ctrl+Enter as with the button: the edits and the stamp', async () => {
        const api = fakeApi({
            ...signedIn,
            'PUT /api/v1/notes/n1': () =>
                json(200, note({ title: 'Shopping', pinned: true })),
        });
        const onSaved = vi.fn();
        renderPage(() => <NoteEditor note={note()} onSaved={onSaved} />);

        const title =
            await screen.findByLabelText<HTMLInputElement>('Title (optional)');
        expect(title.value).toBe('Groceries');
        fireEvent.input(title, { target: { value: 'Shopping' } });
        fireEvent.click(screen.getByRole('switch', { name: 'Pin to the top' }));
        fireEvent.keyDown(title, { key: 'Enter', ctrlKey: true });

        await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
        const calls = api.calls('PUT /api/v1/notes/n1');
        expect(calls).toHaveLength(1);
        expect(await calls[0].json()).toEqual({
            title: 'Shopping',
            body: '- milk',
            pinned: true,
            remindAt: null,
            expectedStamp: 's1',
        });
    });

    it('shows a refused reminder under its field', async () => {
        fakeApi({
            ...signedIn,
            'POST /api/v1/notes': () =>
                json(400, {
                    code: 'ReminderPast',
                    message: 'The time has passed.',
                    field: 'remindAt',
                }),
        });
        renderPage(() => <NoteEditor onSaved={() => {}} />);

        const remind =
            await screen.findByLabelText<HTMLInputElement>(/^Remind me/);
        fireEvent.input(remind, { target: { value: '2020-01-01T09:00' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() =>
            expect(remind.getAttribute('aria-invalid')).toBe('true')
        );
        expect(remind.id).toBe('note-remindAt');
        expect(
            document.getElementById(
                remind.getAttribute('aria-describedby') ?? ''
            )?.textContent
        ).toBe('The time has passed.');
        await expectNoA11yViolations();
    });
});
