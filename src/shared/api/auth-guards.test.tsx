// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { Route } from '@solidjs/router';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderRoutes } from '@shared/testing/render-page';
import { logoutMutation, useResultMutation } from './auth';
import { api, send } from './client';
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

    it('neither shows the page nor redirects when the check fails', async () => {
        for (const answer of [
            () => json(500, { code: 'Boom', message: 'boom' }),
            () => Promise.reject(new TypeError('Failed to fetch')),
        ]) {
            const api = fakeApi({ 'GET /api/v1/auth/me': answer });
            const { history, unmount } = app('/sessions');

            await waitFor(() =>
                expect(api.calls('GET /api/v1/auth/me')).toHaveLength(1)
            );
            await new Promise((done) => setTimeout(done, 20));
            expect(screen.queryByText('secret page')).toBeNull();
            expect(screen.queryByText('sign-in form')).toBeNull();
            expect(history.get()).toBe('/sessions');
            unmount();
        }
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
