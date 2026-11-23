// @vitest-environment jsdom
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
    type MockInstance,
} from 'vitest';
import type { Component } from 'solid-js';
import { render, screen, waitFor } from '@solidjs/testing-library';
import { A, MemoryRouter, createMemoryHistory } from '@solidjs/router';
import { useQuery } from '@tanstack/solid-query';
import { RootMetaContext } from '@shared/meta/page-meta';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { SessionProvider } from '@shared/api/session-provider';
import { RealtimeProvider } from '@features/realtime/realtime-provider';
import { ThemeProvider } from '@shared/theme/theme-context';
import { fakeApi, json } from '@shared/testing/fake-api';
import { freshSession } from '@shared/testing/render-page';
import { expectNoA11yViolations } from '@shared/testing/axe';
import Layout from '@app/Layout';
import { lazyPage, SHOW_AFTER_MS, type LazyPageOptions } from './PageLoading';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A page module that comes when the test says so. */
function slowModule(Page: Component, options?: LazyPageOptions) {
    let resolve: () => void = () => {};
    let reject: (error: unknown) => void = () => {};
    const module = new Promise<{ default: Component }>((ok, fail) => {
        resolve = () => ok({ default: Page });
        reject = fail;
    });
    return {
        Lazy: lazyPage(() => module, options),
        resolve: () => resolve(),
        reject: (error: unknown) => reject(error),
    };
}

const Home = () => (
    <div class="page-stack">
        <h1>Home</h1>
        <A href="/slow">Slow</A>
    </div>
);

/** The real layout around the routes, signed out. */
function renderLayout(routes: Record<string, Component>, path = '/') {
    freshSession();
    fakeApi({
        'GET /api/v1/auth/me': () =>
            json(401, { code: 'Unauthorized', message: 'no' }),
    });
    const history = createMemoryHistory();
    history.set({ value: path });
    const definitions = Object.entries(routes).map(([path, component]) => ({
        path,
        component,
    }));
    render(() => (
        <RootMetaContext.Provider
            value={{ setTitle: () => {}, setDescription: () => {} }}
        >
            <ThemeProvider>
                <I18nProvider>
                    <SessionProvider>
                        <RealtimeProvider>
                            <MemoryRouter history={history} root={Layout}>
                                {definitions}
                            </MemoryRouter>
                        </RealtimeProvider>
                    </SessionProvider>
                </I18nProvider>
            </ThemeProvider>
        </RootMetaContext.Provider>
    ));
    return history;
}

// The page's shape while its code loads, in <main>: the footer stays down.
const skeleton = () => document.querySelector('main .page-skeleton');
// The live region stays; only its text changes.
const status = () =>
    document.querySelector('main > [role="status"]')?.textContent || undefined;

describe('PageLoading', () => {
    let logged: MockInstance<typeof console.error>;
    beforeEach(() => {
        logged = vi.spyOn(console, 'error').mockImplementation(() => {});
        // The navigation asks for the width of the screen.
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => ({
                matches: false,
                addEventListener: () => {},
                removeEventListener: () => {},
            }))
        );
    });
    afterEach(() => logged.mockRestore());

    it('shows the shape of a slow page only after the delay', async () => {
        const slow = slowModule(() => <h1>Slow page</h1>);
        const history = renderLayout({ '/': Home, '/slow': slow.Lazy });
        await screen.findByRole('heading', { name: 'Home' });

        history.set({ value: '/slow' });
        await wait(SHOW_AFTER_MS / 2);
        expect(skeleton()).toBeNull();
        expect(status()).toBeUndefined();

        await wait(SHOW_AFTER_MS);
        expect(skeleton()).not.toBeNull();
        expect(status()).toBe('Loading…');
        await expectNoA11yViolations();

        // In the place of the page, out of reach while it loads.
        const scope = skeleton()?.closest<HTMLElement>('.skeleton-scope');
        expect(scope?.inert).toBe(true);
        expect(scope?.getAttribute('aria-hidden')).toBe('true');
        expect(
            screen.queryByRole('heading', { level: 1, hidden: false })
        ).toBeNull();

        slow.resolve();
        await screen.findByRole('heading', { name: 'Slow page' });
        await waitFor(() => expect(skeleton()).toBeNull());
        expect(status()).toBeUndefined();
    });

    it('never shows the shape of a fast page', async () => {
        const fast = slowModule(() => <h1>Fast page</h1>);
        const history = renderLayout({ '/': Home, '/fast': fast.Lazy });
        await screen.findByRole('heading', { name: 'Home' });

        history.set({ value: '/fast' });
        await wait(SHOW_AFTER_MS / 4);
        fast.resolve();
        await screen.findByRole('heading', { name: 'Fast page' });
        await wait(SHOW_AFTER_MS * 1.5);
        expect(skeleton()).toBeNull();
        expect(status()).toBeUndefined();
    });

    it('shows the form that the page asks for', async () => {
        const slow = slowModule(() => <h1>Slow page</h1>, {
            skeleton: 'table',
        });
        renderLayout({ '/slow': slow.Lazy }, '/slow');
        await wait(SHOW_AFTER_MS * 1.5);
        const main = document.querySelector('main');
        expect(main?.querySelector('.page-skeleton table')).not.toBeNull();
        expect(
            main?.querySelectorAll('.page-skeleton tbody tr').length
        ).toBeGreaterThan(0);
        // One "Loading…": the layout's, not one more from the shape.
        expect(
            [...document.querySelectorAll('main [role="status"]')].map(
                (region) => region.textContent
            )
        ).toEqual(['Loading…']);
        await expectNoA11yViolations();
        slow.resolve();
        await screen.findByRole('heading', { name: 'Slow page' });
    });

    it('gives the frame the width of the page type', async () => {
        const page = (name: string) => () =>
            Promise.resolve({ default: () => <h1>{name}</h1> });
        const Files = lazyPage(page('Files'), { skeleton: 'table' });
        const Terms = lazyPage(page('Terms'), { skeleton: 'document' });
        const history = renderLayout({
            '/': Home,
            '/files': Files,
            '/terms': Terms,
        });
        const width = () =>
            document
                .querySelector('.container-page')
                ?.getAttribute('data-page-width');
        await screen.findByRole('heading', { name: 'Home' });
        // Not a lazy page: the default.
        expect(width()).toBe('default');

        history.set({ value: '/files' });
        await screen.findByRole('heading', { name: 'Files' });
        expect(width()).toBe('wide');

        history.set({ value: '/terms' });
        await screen.findByRole('heading', { name: 'Terms' });
        expect(width()).toBe('text');

        history.set({ value: '/' });
        await screen.findByRole('heading', { name: 'Home' });
        expect(width()).toBe('default');
    });

    it('focuses the heading of the new page once its code is in', async () => {
        const slow = slowModule(() => <h1>Slow page</h1>);
        const history = renderLayout({ '/': Home, '/slow': slow.Lazy });
        await screen.findByRole('heading', { name: 'Home' });

        history.set({ value: '/slow' });
        // Longer than focusHeading looks on its own (30 frames).
        await wait(800);
        slow.resolve();
        const heading = await screen.findByRole('heading', {
            name: 'Slow page',
        });
        await waitFor(() => expect(document.activeElement).toBe(heading));
    });

    it('leaves data loading to the page: no shape, the page stays', async () => {
        let answer: (value: string) => void = () => {};
        const Data = lazyPage(() =>
            Promise.resolve({
                default: () => {
                    const query = useQuery(() => ({
                        queryKey: ['slow-data'],
                        queryFn: () =>
                            new Promise<string>((ok) => (answer = ok)),
                    }));
                    return (
                        <div class="page-stack">
                            <h1>Data page</h1>
                            <p>{query.data ?? 'waiting'}</p>
                        </div>
                    );
                },
            })
        );
        renderLayout({ '/data': Data }, '/data');

        const heading = await screen.findByRole('heading', {
            name: 'Data page',
        });
        await wait(SHOW_AFTER_MS * 1.5);
        expect(screen.getByText('waiting')).toBeTruthy();
        expect(skeleton()).toBeNull();
        expect(status()).toBeUndefined();

        answer('the data');
        expect(await screen.findByText('the data')).toBeTruthy();
        // The same page: data came into it, nothing made it again.
        expect(screen.getByRole('heading', { name: 'Data page' })).toBe(
            heading
        );
    });

    it('lets a failed import reach PageErrorBoundary', async () => {
        const gone = slowModule(() => <h1>Never</h1>);
        renderLayout({ '/gone': gone.Lazy }, '/gone');
        await wait(SHOW_AFTER_MS * 1.5);
        expect(skeleton()).not.toBeNull();

        gone.reject(
            new TypeError(
                'Failed to fetch dynamically imported module: /assets/Gone-abc.js'
            )
        );
        expect(
            await screen.findByRole('heading', {
                level: 1,
                name: 'A new version is available',
            })
        ).toBeTruthy();
        await waitFor(() => expect(skeleton()).toBeNull());
        await expectNoA11yViolations();
    });

    it('shows nothing for a page whose code was preloaded', async () => {
        const early = slowModule(() => <h1>Early page</h1>);
        early.resolve();
        await early.Lazy.preload();
        renderLayout({ '/early': early.Lazy }, '/early');
        expect(
            await screen.findByRole('heading', { name: 'Early page' })
        ).toBeTruthy();
        await wait(SHOW_AFTER_MS * 1.5);
        expect(skeleton()).toBeNull();
    });
});
