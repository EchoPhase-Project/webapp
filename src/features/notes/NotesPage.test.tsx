// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { sessionClient } from '@shared/api/session-provider';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { noteKeys, notesQuery } from './api';
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
        let notes: unknown[] = [];
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/notes': () => json(200, notes),
            'POST /api/v1/notes': () => {
                notes = [note({ id: 'n9', title: 'Idea' })];
                return json(201, notes[0]);
            },
        });

        renderPage(() => <NotesPage />);
        fireEvent.click(
            await screen.findByRole('button', { name: 'New note' })
        );

        fireEvent.input(screen.getByLabelText('Title (optional)'), {
            target: { value: 'Idea' },
        });
        fireEvent.input(screen.getByRole('textbox', { name: 'Text' }), {
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
        // The list is asked again once, and shows the new note.
        expect(await screen.findByText('Idea')).toBeTruthy();
        expect(api.calls('GET /api/v1/notes')).toHaveLength(2);
    });

    it('saves an edited note over the version opened, and lists it again', async () => {
        let notes = [note()];
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/notes': () => json(200, notes),
            'PUT /api/v1/notes/n1': async (req) => {
                const body = (await req.json()) as { title: string };
                notes = [note({ title: body.title, stamp: 's2' })];
                return json(200, notes[0]);
            },
        });

        renderPage(() => <NotesPage />);
        fireEvent.click(await screen.findByText('Groceries'));
        fireEvent.input(screen.getByLabelText('Title (optional)'), {
            target: { value: 'Shopping' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(await screen.findByText('Shopping')).toBeTruthy();
        const [put] = api.calls('PUT /api/v1/notes/n1');
        expect(await put.json()).toMatchObject({
            title: 'Shopping',
            expectedStamp: 's1',
        });
        expect(api.calls('GET /api/v1/notes')).toHaveLength(2);
        await waitFor(() =>
            expect(screen.queryByLabelText('Title (optional)')).toBeNull()
        );
        // The saved note is kept as the server answered it.
        expect(
            sessionClient().getQueryData(noteKeys.detail('n1'))
        ).toMatchObject({ title: 'Shopping', stamp: 's2' });
    });

    it('deletes a note after the confirm, and lists the rest again', async () => {
        let notes = [note(), note({ id: 'n2', title: 'Plan' })];
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/notes': () => json(200, notes),
            'DELETE /api/v1/notes/n1': () => {
                notes = notes.filter((n) => n.id !== 'n1');
                return new Response(null, { status: 204 });
            },
        });

        renderPage(() => <NotesPage />);
        fireEvent.click(await screen.findByText('Groceries'));
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        await screen.findByText(/is deleted for good/);
        fireEvent.click(
            screen.getAllByRole('button', { name: 'Delete' }).at(-1)!
        );

        await waitFor(() => expect(screen.queryByText('Groceries')).toBeNull());
        expect(screen.getByText('Plan')).toBeTruthy();
        expect(api.calls('DELETE /api/v1/notes/n1')).toHaveLength(1);
        expect(api.calls('GET /api/v1/notes')).toHaveLength(2);
    });

    it('leaves a note shared with the user, and lists the rest again', async () => {
        let notes = [
            note({
                access: 'Edit',
                owner: { id: 'u2', userName: 'bob', name: 'Bob' },
            }),
        ];
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/notes': () => json(200, notes),
            'DELETE /api/v1/notes/n1/shares/u1': () => {
                notes = [];
                return new Response(null, { status: 204 });
            },
        });

        renderPage(() => <NotesPage />);
        fireEvent.click(await screen.findByText('Groceries'));
        fireEvent.click(
            screen.getByRole('button', { name: 'Leave this note' })
        );

        expect(await screen.findByText('No notes yet.')).toBeTruthy();
        expect(api.calls('DELETE /api/v1/notes/n1/shares/u1')).toHaveLength(1);
        expect(api.calls('GET /api/v1/notes')).toHaveLength(2);
    });

    it('opens the note of ?open=, then drops the parameter', async () => {
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/notes': () => json(200, []),
            'GET /api/v1/notes/n1': () => json(200, note()),
        });

        const { history } = renderPage(() => <NotesPage />, '/notes?open=n1');

        const title =
            await screen.findByLabelText<HTMLInputElement>('Title (optional)');
        expect(title.value).toBe('Groceries');
        await waitFor(() => expect(history.get()).toBe('/notes'));
        expect(api.calls('GET /api/v1/notes/n1')).toHaveLength(1);
    });

    it('shows a failed list as an error, not as an empty list', async () => {
        let broken = true;
        fakeApi({
            ...signedIn,
            'GET /api/v1/notes': () =>
                broken
                    ? json(500, { code: 'TestBroken', message: 'Try later.' })
                    : json(200, [note()]),
        });

        renderPage(() => <NotesPage />);

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toBe('Try later.');
        expect(screen.queryByText('No notes yet.')).toBeNull();

        broken = false;
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(await screen.findByText('Groceries')).toBeTruthy();
    });

    it('searches after a pause, with no search and blanks as one key', async () => {
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/notes': (req) =>
                json(
                    200,
                    new URL(req.url).searchParams.get('q') === 'milk'
                        ? [note()]
                        : [note(), note({ id: 'n2', title: 'Plan' })]
                ),
        });
        const searches = () =>
            api
                .calls('GET /api/v1/notes')
                .map((r) => new URL(r.url).searchParams.get('q'));

        renderPage(() => <NotesPage />);
        await screen.findByText('Plan');
        const search = screen.getByLabelText('Search notes');

        fireEvent.input(search, { target: { value: ' milk ' } });
        await waitFor(() => expect(screen.queryByText('Plan')).toBeNull());
        expect(searches()).toEqual([null, 'milk']);

        fireEvent.input(search, { target: { value: '   ' } });
        expect(await screen.findByText('Plan')).toBeTruthy();
        // Back to the first key: its answer (still fresh) without a request.
        expect(searches()).toEqual([null, 'milk']);
        const keys = sessionClient()
            .getQueryCache()
            .findAll({ queryKey: noteKeys.lists() })
            .map((q) => q.queryKey);
        expect(keys).toEqual([noteKeys.list(''), noteKeys.list('milk')]);
    });
});

describe('notesQuery', () => {
    it('makes one key of no search, an empty one and blanks', () => {
        const key = notesQuery().queryKey;
        expect(notesQuery('').queryKey).toEqual(key);
        expect(notesQuery('  ').queryKey).toEqual(key);
        expect(notesQuery(' milk ').queryKey).toEqual(noteKeys.list('milk'));
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
