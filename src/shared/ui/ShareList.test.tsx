// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { I18nProvider } from '@shared/i18n/i18n-context';
import ShareList, { type Sharee } from './ShareList';

type Share = { user: Sharee; canEdit: boolean };

function renderList(card = false) {
    let people: Share[] = [
        { user: { id: 'u1', name: 'Ann', userName: 'ann' }, canEdit: true },
    ];
    const list = vi.fn((_of: string) => Promise.resolve(people));
    const share = vi.fn((_of: string, userName: string) => {
        if (userName === 'nobody')
            return Promise.resolve({
                ok: false as const,
                errors: [
                    {
                        code: 'UserNotFound',
                        message: 'No such user.',
                        field: 'userName',
                    },
                ],
            });
        people = [
            ...people,
            {
                user: { id: 'u2', name: 'Bob', userName },
                canEdit: false,
            },
        ];
        return Promise.resolve({ ok: true as const, data: null });
    });
    const unshare = vi.fn((_of: string, userId: string) => {
        people = people.filter((p) => p.user.id !== userId);
        return Promise.resolve();
    });
    const { container } = render(() => (
        <I18nProvider>
            <ShareList
                card={card}
                of="n1"
                id="s"
                title="Shared with"
                empty="Nobody yet."
                removeLabel={(name) => `Stop sharing with ${name}`}
                list={list}
                share={share}
                unshare={unshare}
                detail={(s) => (
                    <span>{s.canEdit ? 'can edit' : 'can read'}</span>
                )}
            />
        </I18nProvider>
    ));
    return { container, list, share, unshare };
}

describe('ShareList', () => {
    it('lists the people with what they may do, and stops sharing with one', async () => {
        const { list, unshare } = renderList();
        expect(await screen.findByText('Ann')).toBeTruthy();
        expect(list).toHaveBeenCalledWith('n1');
        expect(screen.getByText('@ann')).toBeTruthy();
        expect(screen.getByText('can edit')).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', { name: 'Stop sharing with Ann' })
        );
        expect(await screen.findByText('Nobody yet.')).toBeTruthy();
        expect(unshare).toHaveBeenCalledWith('n1', 'u1');
    });

    it('shares with a username, and shows a refusal under the field', async () => {
        const { share } = renderList();
        await screen.findByText('Ann');
        const submit = screen.getByRole('button', { name: 'Share' });
        expect((submit as HTMLButtonElement).disabled).toBe(true);

        const field = screen.getByLabelText('Username');
        fireEvent.input(field, { target: { value: 'nobody' } });
        fireEvent.click(submit);
        expect(await screen.findByText('No such user.')).toBeTruthy();
        expect(field.getAttribute('aria-invalid')).toBe('true');

        fireEvent.input(field, { target: { value: ' bob ' } });
        fireEvent.click(submit);
        expect(await screen.findByText('Bob')).toBeTruthy();
        expect(share).toHaveBeenLastCalledWith('n1', 'bob');
        await waitFor(() => expect((field as HTMLInputElement).value).toBe(''));
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
            card.container.querySelector('.settings-card-footer button')!
                .textContent
        ).toBe('Share');
    });
});
