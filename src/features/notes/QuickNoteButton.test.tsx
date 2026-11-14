// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import NotesPage from './NotesPage';
import QuickNoteButton from './QuickNoteButton';

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

describe('QuickNoteButton', () => {
    afterEach(() => {
        sessionStorage.clear();
    });

    it('asks an open notes list again once after a save', async () => {
        let notes = [note('n1', 'Groceries')];
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/notes': () => json(200, notes),
            'POST /api/v1/notes': () => {
                notes = [note('n2', 'Idea'), ...notes];
                return json(201, notes[0]);
            },
        });

        renderPage(() => (
            <>
                <QuickNoteButton />
                <NotesPage />
            </>
        ));
        await screen.findByText('Groceries');
        // The top bar's button comes first; the page has its own.
        fireEvent.click(screen.getAllByRole('button', { name: 'New note' })[0]);
        fireEvent.input(screen.getByLabelText('Title (optional)'), {
            target: { value: 'Idea' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(await screen.findByText('Idea')).toBeTruthy();
        expect(api.calls('POST /api/v1/notes')).toHaveLength(1);
        expect(api.calls('GET /api/v1/notes')).toHaveLength(2);
    });

    it('sends no request of its own without a user', async () => {
        const api = fakeApi({
            'GET /api/v1/auth/me': () => json(401),
        });

        renderPage(() => <QuickNoteButton />);
        await waitFor(() =>
            expect(api.calls('GET /api/v1/auth/me')).toHaveLength(1)
        );
        fireEvent.click(screen.getByRole('button', { name: 'New note' }));
        await new Promise((r) => setTimeout(r, 20));

        const others = api.requests.filter(
            (r) => !new URL(r.url).pathname.startsWith('/api/v1/auth/')
        );
        expect(others).toHaveLength(0);
    });
});
