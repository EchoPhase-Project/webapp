// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import ShareSection from './ShareSection';

describe('ShareSection', () => {
    it('shares the note with what the switch says, and lists it again', async () => {
        let people: unknown[] = [];
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/notes/n1/shares': () => json(200, people),
            'PUT /api/v1/notes/n1/shares': async (req) => {
                const body = (await req.json()) as {
                    userName: string;
                    canEdit: boolean;
                };
                const added = {
                    user: { id: 'u2', name: 'Bob', userName: body.userName },
                    canEdit: body.canEdit,
                    createdAt: '2026-01-01T00:00:00Z',
                };
                people = [added];
                return json(200, added);
            },
        });

        renderPage(() => <ShareSection noteId="n1" />);
        await screen.findByText('Only you see this note.');

        fireEvent.click(screen.getByRole('switch', { name: 'May edit' }));
        fireEvent.input(screen.getByLabelText('Username'), {
            target: { value: 'bob' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Share' }));

        expect(await screen.findByText('can edit')).toBeTruthy();
        const [put] = api.calls('PUT /api/v1/notes/n1/shares');
        expect(await put.json()).toEqual({ userName: 'bob', canEdit: true });
        await waitFor(() =>
            expect(api.calls('GET /api/v1/notes/n1/shares')).toHaveLength(2)
        );
    });
});
