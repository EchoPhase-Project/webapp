// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@solidjs/testing-library';
import { fakeApi, json, user } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { expectNoA11yViolations } from '@shared/testing/axe';
import AuthPage from './AuthPage';

const signedOut = {
    'GET /api/v1/auth/me': () =>
        json(401, { code: 'Unauthorized', message: 'no' }),
};

/** The login side's form (both sides are in the page; one is inert). */
const loginForm = async () => {
    const form = (
        await screen.findByRole('heading', { name: 'Log in' })
    ).closest('form') as HTMLFormElement;
    // Its inputs are enabled once the translations are in.
    await within(form).findByRole('button', { name: 'Log in' });
    return form;
};

describe('AuthPage', () => {
    it('shows a refused login at the form top, which takes the focus', async () => {
        const api = fakeApi({
            ...signedOut,
            'POST /api/v1/auth/login': () =>
                json(401, {
                    code: 'TestBadLogin',
                    message: 'Wrong username or password.',
                }),
        });
        renderPage(() => <AuthPage />, '/auth');

        const form = await loginForm();
        fireEvent.input(within(form).getByLabelText('Username'), {
            target: { value: 'dusty' },
        });
        fireEvent.input(within(form).getByLabelText('Password'), {
            target: { value: 'nope' },
        });
        fireEvent.click(
            await within(form).findByRole('button', { name: 'Log in' })
        );

        const summary = await screen.findByRole('alert');
        expect(summary.textContent).toBe('Wrong username or password.');
        expect(document.activeElement).toBe(summary);
        expect(await api.calls('POST /api/v1/auth/login')[0].json()).toEqual({
            username: 'dusty',
            password: 'nope',
        });
        await expectNoA11yViolations();
    });

    it('signs in and leaves the form once the user is known', async () => {
        let signedIn = false;
        fakeApi({
            'GET /api/v1/auth/me': () =>
                signedIn
                    ? json(200, user())
                    : json(401, { code: 'Unauthorized', message: 'no' }),
            'GET /api/v1/roles/me': () => json(200, []),
            'POST /api/v1/auth/login': () => {
                signedIn = true;
                return new Response(null, { status: 204 });
            },
        });
        renderPage(() => <AuthPage />, '/auth');

        const form = await loginForm();
        fireEvent.click(
            await within(form).findByRole('button', { name: 'Log in' })
        );

        await waitFor(() =>
            expect(screen.queryByRole('heading', { name: 'Log in' })).toBe(null)
        );
    });

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
        renderPage(() => <AuthPage />, '/auth?mode=signup');

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

    it('opens ?next= in a new session once signed in', async () => {
        let signedIn = false;
        fakeApi({
            'GET /api/v1/auth/me': () =>
                signedIn
                    ? json(200, user())
                    : json(401, { code: 'Unauthorized', message: 'no' }),
            'GET /api/v1/roles/me': () => json(200, []),
            'POST /api/v1/auth/login': () => {
                signedIn = true;
                return new Response(null, { status: 204 });
            },
        });
        const { history } = renderPage(
            () => <AuthPage />,
            '/auth?next=%2Ffiles%3Fview%3Dgrid'
        );

        const form = await loginForm();
        fireEvent.click(
            await within(form).findByRole('button', { name: 'Log in' })
        );

        await waitFor(() => expect(history.get()).toBe('/files?view=grid'));
    });
});
