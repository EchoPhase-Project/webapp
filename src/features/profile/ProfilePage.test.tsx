// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi, json, user } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import ProfilePage from './ProfilePage';

describe('ProfilePage', () => {
    afterEach(() => {
        sessionStorage.clear();
    });

    it('uploads a picture and shows it', async () => {
        let avatar: string | null = null;
        const api = fakeApi({
            'GET /api/v1/auth/me': () =>
                json(200, user({ avatarFileId: avatar })),
            'GET /api/v1/roles/me': () => json(200, []),
            'PUT /api/v1/auth/me/avatar': () => {
                avatar = 'a1';
                return json(200, { id: 'a1' });
            },
        });

        const { container } = renderPage(() => <ProfilePage />);
        expect(await screen.findByText('D')).toBeTruthy();

        const input =
            container.querySelector<HTMLInputElement>('input[type="file"]')!;
        expect(input.accept).toBe('image/png,image/jpeg,image/webp');
        Object.defineProperty(input, 'files', {
            value: [new File(['png'], 'me.png', { type: 'image/png' })],
        });
        fireEvent.change(input);

        await waitFor(() =>
            expect(
                container.querySelector('.avatar img')?.getAttribute('src')
            ).toBe('/api/v1/files/a1/content')
        );
        expect(api.calls('PUT /api/v1/auth/me/avatar')).toHaveLength(1);
        expect(screen.getByRole('button', { name: 'Remove' })).toBeTruthy();
    });

    it('saves only the changed name', async () => {
        const api = fakeApi({
            'GET /api/v1/auth/me': () =>
                json(200, user({ avatarFileId: null })),
            'GET /api/v1/roles/me': () => json(200, []),
            'PATCH /api/v1/auth/me': () =>
                json(200, user({ avatarFileId: null, name: 'Rusty' })),
        });

        renderPage(() => <ProfilePage />);

        const name = await screen.findByLabelText('Display name');
        fireEvent.input(name, { target: { value: 'Rusty' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(await screen.findByText('Saved')).toBeTruthy();
        const [patch] = api.calls('PATCH /api/v1/auth/me');
        expect(await patch.json()).toEqual({
            name: 'Rusty',
            username: null,
            timeZone: null,
        });
    });

    it('shows a refused username under its field, not as saved', async () => {
        fakeApi({
            'GET /api/v1/auth/me': () =>
                json(200, user({ avatarFileId: null })),
            'GET /api/v1/roles/me': () => json(200, []),
            'PATCH /api/v1/auth/me': () =>
                json(409, [
                    {
                        code: 'TestTaken',
                        message: 'That username is taken.',
                        field: 'username',
                    },
                ]),
        });

        renderPage(() => <ProfilePage />);

        const username = await screen.findByLabelText(/^Username/);
        fireEvent.input(username, { target: { value: 'rusty' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() =>
            expect(username.getAttribute('aria-invalid')).toBe('true')
        );
        expect(document.activeElement).toBe(username);
        expect(
            document.getElementById('profile-username-error')?.textContent
        ).toBe('That username is taken.');
        expect(screen.queryByText('Saved')).toBe(null);
    });
});
