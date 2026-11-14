// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import {
    mutationOptions,
    queryOptions,
    type QueryClient,
} from '@tanstack/solid-query';
import { api, request } from '@shared/api/client';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { SessionProvider } from '@shared/api/session-provider';
import { fakeApi, json } from '@shared/testing/fake-api';
import { freshSession } from '@shared/testing/render-page';
import ShareList, { type Sharee } from './ShareList';

type Share = { user: Sharee; canEdit: boolean };

// The descriptions a feature's api.ts would give, on the notes' routes.
const sharesKey = ['things', 'detail', 'n1', 'shares'] as const;
const sharesQuery = queryOptions({
    queryKey: sharesKey,
    queryFn: ({ signal }) =>
        request<Share[]>(
            api.GET('/api/v1/notes/{id}/shares', {
                params: { path: { id: 'n1' } },
                signal,
            })
        ),
});
const share = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: ['things', 'share'] as const,
        mutationFn: (userName: string) =>
            request(
                api.PUT('/api/v1/notes/{id}/shares', {
                    params: { path: { id: 'n1' } },
                    body: { userName, canEdit: false },
                })
            ),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: sharesKey }),
    });
const unshare = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: ['things', 'unshare'] as const,
        mutationFn: (userId: string) =>
            request(
                api.DELETE('/api/v1/notes/{id}/shares/{userId}', {
                    params: { path: { id: 'n1', userId } },
                })
            ),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: sharesKey }),
    });

const LIST = 'GET /api/v1/notes/n1/shares';

function renderList(card = false, broken = false) {
    let people: Share[] = [
        { user: { id: 'u1', name: 'Ann', userName: 'ann' }, canEdit: true },
    ];
    const state = { broken };
    const server = fakeApi({
        [LIST]: () =>
            state.broken
                ? json(500, { code: 'TestBroken', message: 'Try later.' })
                : json(200, people),
        'PUT /api/v1/notes/n1/shares': async (req) => {
            const { userName } = (await req.json()) as { userName: string };
            if (userName === 'nobody')
                return json(404, {
                    code: 'UserNotFound',
                    message: 'No such user.',
                    field: 'userName',
                });
            const added = {
                user: { id: 'u2', name: 'Bob', userName },
                canEdit: false,
            };
            people = [...people, added];
            return json(200, added);
        },
        'DELETE /api/v1/notes/n1/shares/u1': () => {
            people = people.filter((p) => p.user.id !== 'u1');
            return json(204);
        },
    });
    freshSession();
    const { container } = render(() => (
        <I18nProvider>
            <SessionProvider>
                <ShareList
                    card={card}
                    id="s"
                    title="Shared with"
                    empty="Nobody yet."
                    removeLabel={(name) => `Stop sharing with ${name}`}
                    query={sharesQuery}
                    share={share}
                    unshare={unshare}
                    detail={(s) => (
                        <span>{s.canEdit ? 'can edit' : 'can read'}</span>
                    )}
                />
            </SessionProvider>
        </I18nProvider>
    ));
    return { container, server, state };
}

describe('ShareList', () => {
    it('lists the people with what they may do, and stops sharing with one', async () => {
        const { server } = renderList();
        expect(await screen.findByText('Ann')).toBeTruthy();
        expect(screen.getByText('@ann')).toBeTruthy();
        expect(screen.getByText('can edit')).toBeTruthy();
        expect(server.calls(LIST)).toHaveLength(1);

        fireEvent.click(
            screen.getByRole('button', { name: 'Stop sharing with Ann' })
        );
        expect(await screen.findByText('Nobody yet.')).toBeTruthy();
        expect(server.calls('DELETE /api/v1/notes/n1/shares/u1')).toHaveLength(
            1
        );
        // The list is asked again once, after the removal.
        expect(server.calls(LIST)).toHaveLength(2);
    });

    it('shares with a username, and shows a refusal under the field', async () => {
        const { server } = renderList();
        await screen.findByText('Ann');
        const submit = screen.getByRole('button', { name: 'Share' });
        expect((submit as HTMLButtonElement).disabled).toBe(true);

        const field = screen.getByLabelText('Username');
        fireEvent.input(field, { target: { value: 'nobody' } });
        fireEvent.click(submit);
        expect(await screen.findByText('No such user.')).toBeTruthy();
        expect(field.getAttribute('aria-invalid')).toBe('true');
        // A refusal changes nothing: the list is not asked again.
        expect(server.calls(LIST)).toHaveLength(1);

        fireEvent.input(field, { target: { value: ' bob ' } });
        fireEvent.click(submit);
        expect(await screen.findByText('Bob')).toBeTruthy();
        const puts = server.calls('PUT /api/v1/notes/n1/shares');
        expect(await puts[1].json()).toEqual({
            userName: 'bob',
            canEdit: false,
        });
        await waitFor(() => expect((field as HTMLInputElement).value).toBe(''));
        expect(server.calls(LIST)).toHaveLength(2);
    });

    it('shows a failed list as an error, not as nobody, and asks again', async () => {
        const { server, state } = renderList(false, true);
        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toBe('Try later.');
        expect(screen.queryByText('Nobody yet.')).toBeNull();

        state.broken = false;
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(await screen.findByText('Ann')).toBeTruthy();
        expect(server.calls(LIST)).toHaveLength(2);
    });

    it('is a section, or a settings card whose footer shares', async () => {
        const section = renderList();
        await screen.findByText('Ann');
        expect(
            section.container.querySelector('section.share-list')
        ).toBeTruthy();
        section.container.remove();

        const card = renderList(true);
        await screen.findByText('Ann');
        expect(card.container.querySelector('form.settings-card')).toBeTruthy();
        expect(
            card.container.querySelector('.settings-card-footer button')
                ?.textContent
        ).toBe('Share');
    });
});
