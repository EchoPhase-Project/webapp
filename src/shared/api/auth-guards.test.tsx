// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { Route } from '@solidjs/router';
import { fakeApi, json, signedIn, user } from '@shared/testing/fake-api';
import { renderRoutes } from '@shared/testing/render-page';
import { logoutMutation, useResultMutation } from './auth';
import { authKeys } from './auth-keys';
import { api, send } from './client';
import { outage } from './outage-watch';
import { sessionClient } from './session-provider';
import { SignedIn, SignedOut, requireAuth, safeNext } from './auth-guards';

describe('safeNext', () => {
    it('keeps a path of this site', () => {
        expect(safeNext('/sessions?page=2#top')).toBe('/sessions?page=2#top');
    });

    it('goes home for anything else', () => {
        for (const next of [
            null,
            '',
            'https://evil.example',
            '//evil.example',
            '/\\evil.example',
            '/auth',
            '/auth?next=/x',
        ])
            expect(safeNext(next)).toBe('/');
    });
});

function SecretPage() {
    const logout = useResultMutation(logoutMutation);
    return (
        <>
            <p>secret page</p>
            <button onClick={() => void logout()}>log out</button>
        </>
    );
}

const app = (start: string) =>
    renderRoutes(
        () => (
            <>
                <Route path="/sessions" component={requireAuth(SecretPage)} />
                <Route
                    path="/"
                    component={() => (
                        <>
                            <SignedIn>
                                <p>logout button</p>
                            </SignedIn>
                            <SignedOut>
                                <p>login link</p>
                            </SignedOut>
                            <p>public text</p>
                        </>
                    )}
                />
                <Route path="/auth" component={() => <p>sign-in form</p>} />
            </>
        ),
        start
    );

describe('requireAuth', () => {
    it('sends a signed-out user to sign in, with the way back', async () => {
        fakeApi({ 'GET /api/v1/auth/me': () => json(401) });
        const { history } = app('/sessions?page=2');

        expect(await screen.findByText('sign-in form')).toBeTruthy();
        expect(screen.queryByText('secret page')).toBeNull();
        expect(history.get()).toBe('/auth?next=%2Fsessions%3Fpage%3D2');
    });

    it('shows the page to a signed-in user, until the session ends', async () => {
        fakeApi({ ...signedIn, 'GET /api/v1/sessions': () => json(401) });
        const { history } = app('/sessions');

        expect(await screen.findByText('secret page')).toBeTruthy();

        // Any API call answering 401 means the session is over.
        await send(api.GET('/api/v1/sessions'));
        expect(await screen.findByText('sign-in form')).toBeTruthy();
        expect(history.get()).toBe('/auth?next=%2Fsessions');
    });

    it('shows nothing while the user loads', async () => {
        const api = fakeApi({
            'GET /api/v1/auth/me': () => new Promise<Response>(() => {}),
        });
        const { history } = app('/sessions');

        await waitFor(() =>
            expect(api.calls('GET /api/v1/auth/me')).toHaveLength(1)
        );
        expect(screen.queryByText('secret page')).toBeNull();
        expect(screen.queryByText('sign-in form')).toBeNull();
        expect(history.get()).toBe('/sessions');
    });

    it('keeps the page of a known user when a later check fails', async () => {
        let meAnswer = () => json(200, user());
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/auth/me': () => meAnswer(),
        });
        const { history } = app('/sessions');
        expect(await screen.findByText('secret page')).toBeTruthy();

        // A background refresh (back to the tab) answers 500: Query keeps
        // the user, and so does the guard.
        meAnswer = () => json(500, { code: 'Boom', message: 'boom' });
        await sessionClient().refetchQueries({ queryKey: authKeys.me() });

        expect(api.calls('GET /api/v1/auth/me')).toHaveLength(2);
        expect(screen.getByText('secret page')).toBeTruthy();
        expect(screen.queryByRole('alert')).toBeNull();
        expect(history.get()).toBe('/sessions');
    });

    it('shows a failed first check (a 500) with a way to ask again', async () => {
        let meAnswer = () => json(500, { code: 'Boom', message: 'boom' });
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/auth/me': () => meAnswer(),
        });
        const { history } = app('/sessions');

        expect((await screen.findByRole('alert')).textContent).toContain(
            'boom'
        );
        expect(screen.queryByText('secret page')).toBeNull();
        expect(history.get()).toBe('/sessions');

        meAnswer = () => json(200, user());
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

        expect(await screen.findByText('secret page')).toBeTruthy();
        expect(api.calls('GET /api/v1/auth/me')).toHaveLength(2);
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('after a logout opens the same address, and so sends to sign in', async () => {
        fakeApi({
            ...signedIn,
            'DELETE /api/v1/sessions/current': () =>
                new Response(null, { status: 204 }),
        });
        const { history } = app('/sessions');

        fireEvent.click(await screen.findByText('log out'));

        expect(await screen.findByText('sign-in form')).toBeTruthy();
        expect(history.get()).toBe('/auth?next=%2Fsessions');
    });
});

// Last: the outage watch is module state, and once it has seen an outage
// it stays for the rest of the file.
describe('requireAuth during an outage', () => {
    it('neither shows the page nor redirects (the outage screen covers it)', async () => {
        for (const answer of [
            () => Promise.reject(new TypeError('Failed to fetch')),
            () => json(502),
        ]) {
            const api = fakeApi({ 'GET /api/v1/auth/me': answer });
            const { history, unmount } = app('/sessions');

            await waitFor(() =>
                expect(api.calls('GET /api/v1/auth/me')).toHaveLength(1)
            );
            await waitFor(() => expect(outage()).not.toBeNull());
            await new Promise((done) => setTimeout(done, 20));
            expect(screen.queryByText('secret page')).toBeNull();
            expect(screen.queryByText('sign-in form')).toBeNull();
            expect(screen.queryByRole('alert')).toBeNull();
            expect(history.get()).toBe('/sessions');
            unmount();
        }
    });
});

describe('SignedIn / SignedOut', () => {
    it('renders only the parts for the current state', async () => {
        fakeApi(signedIn);
        app('/');
        expect(await screen.findByText('logout button')).toBeTruthy();
        expect(screen.queryByText('login link')).toBeNull();
        expect(screen.getByText('public text')).toBeTruthy();
    });

    it('shows the signed-out parts to a guest', async () => {
        fakeApi({ 'GET /api/v1/auth/me': () => json(401) });
        app('/');
        expect(await screen.findByText('login link')).toBeTruthy();
        expect(screen.queryByText('logout button')).toBeNull();
    });
});
