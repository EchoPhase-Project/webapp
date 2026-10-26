// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi, json } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import ProfilePage from './ProfilePage';

const me = (avatarFileId: string | null = null) => ({
    id: 'u1',
    userName: 'dusty',
    name: 'Dusty',
    timeZone: 'UTC',
    avatarFileId,
});

describe('ProfilePage', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        sessionStorage.clear();
    });

    it('uploads a picture and shows it', async () => {
        let avatar: string | null = null;
        const api = fakeApi({
            'GET /api/v1/auth/me': () => json(200, me(avatar)),
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
            'GET /api/v1/auth/me': () => json(200, me()),
            'GET /api/v1/roles/me': () => json(200, []),
            'PATCH /api/v1/auth/me': () =>
                json(200, { ...me(), name: 'Rusty' }),
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
});
