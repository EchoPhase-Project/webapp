// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@solidjs/testing-library';
import { fakeApi, json, user } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { expectNoA11yViolations } from '@shared/testing/axe';
import LoginPage from './LoginPage';

const signedOut = {
    'GET /api/v1/auth/me': () =>
        json(401, { code: 'Unauthorized', message: 'no' }),
};

/** The login form, under the page's header. */
const loginForm = async () => {
    await screen.findByRole('heading', { level: 1, name: 'Log in' });
    const form = document.querySelector('form') as HTMLFormElement;
    // Its inputs are enabled once the translations are in.
    await within(form).findByRole('button', { name: 'Log in' });
    return form;
};

describe('LoginPage', () => {
    it('shows a refused login at the form top, which takes the focus', async () => {
        const api = fakeApi({
            ...signedOut,
            'POST /api/v1/auth/login': () =>
                json(401, {
                    code: 'TestBadLogin',
                    message: 'Wrong username or password.',
                }),
        });
        renderPage(() => <LoginPage />, '/auth/login');

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

    it('sends a signed-in user on to ?next= without showing the form', async () => {
        let answer: (r: Response) => void = () => {};
        fakeApi({
            'GET /api/v1/auth/me': () =>
                new Promise<Response>((done) => (answer = done)),
            'GET /api/v1/roles/me': () => json(200, []),
        });
        const { history } = renderPage(
            () => <LoginPage />,
            '/auth/login?next=%2Ffiles'
        );

        // While the session is asked for: no form, no heading.
        await new Promise((done) => setTimeout(done, 20));
        expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
        expect(document.querySelector('form')).toBeNull();

        answer(json(200, user()));
        await waitFor(() => expect(history.get()).toBe('/files'));
        expect(document.querySelector('form')).toBeNull();
    });

    it('shows the form when the check of the session failed', async () => {
        fakeApi({
            'GET /api/v1/auth/me': () =>
                json(500, { code: 'Boom', message: 'Server error.' }),
        });
        renderPage(() => <LoginPage />, '/auth/login');
        expect(
            await screen.findByRole('heading', { level: 1, name: 'Log in' })
        ).toBeTruthy();
    });

    it('has one h1 from its header, and a link to sign up that keeps ?next=', async () => {
        fakeApi(signedOut);
        renderPage(() => <LoginPage />, '/auth/login?next=%2Ffiles');
        await loginForm();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(
            screen.getByRole('link', { name: 'Sign up' }).getAttribute('href')
        ).toBe('/auth/signup?next=%2Ffiles');
        await expectNoA11yViolations();
    });

    it.each([
        ['/auth/login', '/'],
        ['/auth/login?next=%2Ffiles%3Fview%3Dgrid', '/files?view=grid'],
    ])('signs in at %s and opens %s in a new session', async (from, to) => {
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
        const { history } = renderPage(() => <LoginPage />, from);

        const form = await loginForm();
        fireEvent.click(
            await within(form).findByRole('button', { name: 'Log in' })
        );

        await waitFor(() => expect(history.get()).toBe(to));
        expect(screen.queryByRole('heading', { name: 'Log in' })).toBeNull();
    });
});
