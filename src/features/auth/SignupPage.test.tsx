// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi, json } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { expectNoA11yViolations } from '@shared/testing/axe';
import SignupPage from './SignupPage';

const signedOut = {
    'GET /api/v1/auth/me': () =>
        json(401, { code: 'Unauthorized', message: 'no' }),
};

describe('SignupPage', () => {
    it('shows a sign-up field error under its field, which takes the focus', async () => {
        fakeApi({
            ...signedOut,
            'POST /api/v1/auth/register': () =>
                json(400, [
                    {
                        code: 'TestTaken',
                        message: 'That username is taken.',
                        field: 'username',
                    },
                ]),
        });
        renderPage(() => <SignupPage />, '/auth/signup');

        await screen.findByRole('heading', { name: 'Sign up' });
        fireEvent.click(
            await screen.findByRole('button', { name: 'Create account' })
        );

        const input = document.getElementById('register-username');
        await waitFor(() =>
            expect(input?.getAttribute('aria-invalid')).toBe('true')
        );
        expect(document.activeElement).toBe(input);
        expect(
            document.getElementById('register-username-error')?.textContent
        ).toBe('That username is taken.');
        await expectNoA11yViolations();
    });

    it('has one h1 from its header, and a link to log in', async () => {
        fakeApi(signedOut);
        renderPage(() => <SignupPage />, '/auth/signup');
        await screen.findByRole('heading', { level: 1, name: 'Sign up' });
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(
            screen.getByRole('link', { name: 'Log in' }).getAttribute('href')
        ).toBe('/auth/login');
        await expectNoA11yViolations();
    });
});
