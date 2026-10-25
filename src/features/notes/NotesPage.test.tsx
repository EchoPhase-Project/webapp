// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import NotesPage from './NotesPage';

const note = (over: Record<string, unknown> = {}) => ({
    id: 'n1',
    title: 'Groceries',
    body: '- **milk**\n- bread',
    pinned: false,
    remindAt: null,
    access: 'Owner',
    owner: { id: 'u1', userName: 'dusty', name: 'Dusty' },
    stamp: 's1',
    createdAt: '2026-10-25T10:00:00Z',
    updatedAt: '2026-10-25T10:00:00Z',
    ...over,
});

describe('NotesPage', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        sessionStorage.clear();
    });

    it('lists notes with a plain preview and who shared them', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/notes': () =>
                json(200, [
                    note(),
                    note({
                        id: 'n2',
                        title: 'Plan',
                        access: 'Read',
                        owner: { id: 'u2', userName: 'bob', name: 'Bob' },
                    }),
                ]),
        });

        renderPage(() => <NotesPage />);

        expect(await screen.findByText('Groceries')).toBeTruthy();
        expect(screen.getAllByText('milk bread')).toHaveLength(2);
        expect(screen.getByText(/from Bob/)).toBeTruthy();
    });

    it('writes a new note and previews its Markdown', async () => {
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/notes': () => json(200, []),
            'POST /api/v1/notes': () =>
                json(201, note({ id: 'n9', title: 'Idea' })),
        });

        renderPage(() => <NotesPage />);
        fireEvent.click(
            await screen.findByRole('button', { name: 'New note' })
        );

        fireEvent.input(screen.getByLabelText('Title (optional)'), {
            target: { value: 'Idea' },
        });
        fireEvent.input(screen.getByLabelText('Text'), {
            target: { value: '# Big\n\n<b>raw</b>' },
        });
        fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
        expect(screen.getByRole('heading', { name: 'Big' })).toBeTruthy();
        expect(screen.getByText('<b>raw</b>')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() =>
            expect(api.calls('POST /api/v1/notes')).toHaveLength(1)
        );
        const body = (await api.calls('POST /api/v1/notes')[0].json()) as {
            title: string;
            body: string;
        };
        expect(body.title).toBe('Idea');
        expect(body.body).toBe('# Big\n\n<b>raw</b>');
    });

    it('shows a note shared to read without the editor', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/notes': () =>
                json(200, [
                    note({
                        access: 'Read',
                        owner: { id: 'u2', userName: 'bob', name: 'Bob' },
                    }),
                ]),
        });

        renderPage(() => <NotesPage />);
        fireEvent.click(await screen.findByText('Groceries'));

        expect(await screen.findByText('Shared by Bob')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
        expect(
            screen.getByRole('button', { name: 'Leave this note' })
        ).toBeTruthy();
    });
});
