// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { useAuth } from '@shared/api/auth';
import { CsrfService } from '@shared/api/csrf';
import { fakeApi, json, user } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import PasswordForm from './PasswordForm';

const fill = (current: string, next: string, again: string) => {
    fireEvent.input(screen.getByLabelText('Current password'), {
        target: { value: current },
    });
    fireEvent.input(screen.getByLabelText('New password'), {
        target: { value: next },
    });
    fireEvent.input(screen.getByLabelText('New password again'), {
        target: { value: again },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
};

describe('PasswordForm', () => {
    it('catches two different new passwords before asking the server', async () => {
        const api = fakeApi({});
        renderPage(() => <PasswordForm />);
        fill('Old-pass1', 'New-pass1', 'New-pass2');

        expect(
            (await screen.findAllByText('The two new passwords differ.')).length
        ).toBeGreaterThan(0);
        expect(api.calls('POST /api/v1/auth/me/password')).toHaveLength(0);
    });

    it('changes it and says the other devices are signed out', async () => {
        const api = fakeApi({
            'POST /api/v1/auth/me/password': () =>
                new Response(null, { status: 204 }),
        });
        renderPage(() => <PasswordForm />);
        fill('Old-pass1', 'New-pass1', 'New-pass1');

        expect(
            await screen.findByText(/other devices are signed out/)
        ).toBeTruthy();
        const body = (await api
            .calls('POST /api/v1/auth/me/password')[0]
            .json()) as Record<string, string>;
        expect(body).toEqual({
            currentPassword: 'Old-pass1',
            newPassword: 'New-pass1',
        });
        expect(
            screen.getByLabelText<HTMLInputElement>('Current password').value
        ).toBe('');
    });

    it('shows a wrong current password under that field', async () => {
        fakeApi({
            'POST /api/v1/auth/me/password': () =>
                json(400, [
                    {
                        code: 'PasswordMismatch',
                        message: 'Incorrect password.',
                        field: 'currentPassword',
                    },
                ]),
        });
        renderPage(() => <PasswordForm />);
        fill('Wrong-pass1', 'New-pass1', 'New-pass1');

        await waitFor(() =>
            expect(
                screen
                    .getByLabelText('Current password')
                    .getAttribute('aria-invalid')
            ).toBe('true')
        );
    });

    it('asks /auth/me again afterwards, which brings a new CSRF token', async () => {
        let token = 'before';
        const api = fakeApi({
            'GET /api/v1/auth/me': () =>
                new Response(JSON.stringify(user()), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        [CsrfService.HEADER]: token,
                    },
                }),
            'GET /api/v1/roles/me': () => json(200, []),
            'POST /api/v1/auth/me/password': () => {
                token = 'after';
                return new Response(null, { status: 204 });
            },
        });
        function Page() {
            const auth = useAuth();
            return (
                <>
                    <p>{auth.user()?.name}</p>
                    <PasswordForm />
                </>
            );
        }
        renderPage(() => <Page />);
        expect(await screen.findByText('Dusty')).toBeTruthy();
        expect(CsrfService.getToken()).toBe('before');

        fill('Old-pass1', 'New-pass1', 'New-pass1');

        await waitFor(() =>
            expect(api.calls('GET /api/v1/auth/me')).toHaveLength(2)
        );
        await waitFor(() => expect(CsrfService.getToken()).toBe('after'));
        sessionStorage.clear();
    });
});
