// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@solidjs/testing-library';
import { MemoryRouter, Route, createMemoryHistory } from '@solidjs/router';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { AuthProvider } from './auth-provider';
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

function app(start: string) {
    const history = createMemoryHistory();
    history.set({ value: start });
    render(() => (
        <I18nProvider>
            <AuthProvider>
                <MemoryRouter history={history}>
                    <Route
                        path="/sessions"
                        component={requireAuth(() => (
                            <p>secret page</p>
                        ))}
                    />
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
                </MemoryRouter>
            </AuthProvider>
        </I18nProvider>
    ));
    return history;
}

describe('requireAuth', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('sends a signed-out user to sign in, with the way back', async () => {
        fakeApi({ 'GET /api/v1/auth/me': () => json(401) });
        const history = app('/sessions?page=2');

        expect(await screen.findByText('sign-in form')).toBeTruthy();
        expect(screen.queryByText('secret page')).toBeNull();
        expect(history.get()).toBe('/auth?next=%2Fsessions%3Fpage%3D2');
    });

    it('shows the page to a signed-in user, until the session ends', async () => {
        fakeApi({ ...signedIn, 'GET /api/v1/sessions': () => json(401) });
        const history = app('/sessions');

        expect(await screen.findByText('secret page')).toBeTruthy();

        // Any API call answering 401 means the session is over.
        await send(api.GET('/api/v1/sessions'));
        expect(await screen.findByText('sign-in form')).toBeTruthy();
        expect(history.get()).toBe('/auth?next=%2Fsessions');
    });
});

describe('SignedIn / SignedOut', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

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
