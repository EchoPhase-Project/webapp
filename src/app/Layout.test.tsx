// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Component } from 'solid-js';
import { cleanup, render, screen, within } from '@solidjs/testing-library';
import { MemoryRouter, createMemoryHistory } from '@solidjs/router';
import { RootMetaContext } from '@shared/meta/page-meta';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { SessionProvider } from '@shared/api/session-provider';
import { RealtimeProvider } from '@features/realtime/realtime-provider';
import { ThemeProvider } from '@shared/theme/theme-context';
import { fakeApi, json } from '@shared/testing/fake-api';
import { freshSession } from '@shared/testing/render-page';
import { expectNoA11yViolations } from '@shared/testing/axe';
import Layout from '@app/Layout';

const Page: Component = () => (
    <div class="page-stack">
        <h1>A page</h1>
    </div>
);

/** The real layout around one page at `path`, signed out, on desktop. */
function renderLayout(path: string) {
    freshSession();
    fakeApi({
        'GET /api/v1/auth/me': () =>
            json(401, { code: 'Unauthorized', message: 'no' }),
    });
    const history = createMemoryHistory();
    history.set({ value: path });
    render(() => (
        <RootMetaContext.Provider
            value={{ setTitle: () => {}, setDescription: () => {} }}
        >
            <ThemeProvider>
                <I18nProvider>
                    <SessionProvider>
                        <RealtimeProvider>
                            <MemoryRouter history={history} root={Layout}>
                                {[
                                    { path: '/', component: Page },
                                    { path: '/auth/login', component: Page },
                                    { path: '/auth/signup', component: Page },
                                ]}
                            </MemoryRouter>
                        </RealtimeProvider>
                    </SessionProvider>
                </I18nProvider>
            </ThemeProvider>
        </RootMetaContext.Provider>
    ));
}

/** Whether `a` comes before `b` in the document (and so in the tab order). */
const before = (a: Element, b: Element) =>
    !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('Layout', () => {
    beforeEach(() => {
        // Desktop: the navigation asks for the width of the screen.
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => ({
                matches: false,
                addEventListener: () => {},
                removeEventListener: () => {},
            }))
        );
    });
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('puts the logo in the bar, the rail under it, then the page', async () => {
        renderLayout('/');
        await screen.findByRole('heading', { name: 'A page' });

        const bar = screen.getByRole('banner');
        const home = within(bar).getByRole('link', { name: 'Home' });
        expect(home.getAttribute('href')).toBe('/');

        const rail = screen.getByRole('navigation', {
            name: 'Main navigation',
        });
        expect(rail.contains(home)).toBe(false);
        expect(within(rail).queryByRole('link', { name: 'Home' })).toBeNull();

        // Tab order: the skip link, the logo, the bar's buttons, the rail,
        // the page.
        const skip = screen.getByRole('link', { name: 'Skip to content' });
        const main = screen.getByRole('main');
        expect(before(skip, home)).toBe(true);
        expect(before(bar, rail)).toBe(true);
        expect(before(rail, main)).toBe(true);

        await expectNoA11yViolations();
    });

    it('leaves the bar alone while the rail is wide', async () => {
        renderLayout('/');
        await screen.findByRole('heading', { name: 'A page' });
        const rail = screen.getByRole('navigation', {
            name: 'Main navigation',
        });
        const bar = screen.getByRole('banner');
        // Once the session is known (the rail's links are in).
        const [first] = await within(rail).findAllByRole('link');
        const home = within(bar).getByRole('link', { name: 'Home' });
        const content = bar.innerHTML;

        // The keyboard in the rail widens it (:has(:focus-visible)).
        first?.focus();
        expect(document.activeElement).toBe(first);

        expect(bar.innerHTML).toBe(content);
        expect(bar.contains(home)).toBe(true);
        expect(rail.contains(bar)).toBe(false);
        expect(bar.contains(rail)).toBe(false);
    });

    it("offers log in and sign up at the bar's end while signed out", async () => {
        renderLayout('/');
        const bar = screen.getByRole('banner');
        const login = await within(bar).findByRole('link', { name: 'Log in' });
        const signup = within(bar).getByRole('link', { name: 'Sign up' });
        expect(login.getAttribute('href')).toBe('/auth/login');
        expect(signup.getAttribute('href')).toBe('/auth/signup');
        expect(before(login, signup)).toBe(true);
        await expectNoA11yViolations();
    });

    it.each([
        ['/auth/login', 'Sign up', 'Log in'],
        ['/auth/signup', 'Log in', 'Sign up'],
    ])(
        "has the bar and the rail on %s, with only the other page's link",
        async (path, shown, hidden) => {
            renderLayout(path);
            await screen.findByRole('heading', { name: 'A page' });

            const bar = screen.getByRole('banner');
            expect(
                within(bar)
                    .getByRole('link', { name: 'Home' })
                    .getAttribute('href')
            ).toBe('/');
            await within(bar).findByRole('link', { name: shown });
            expect(
                within(bar).queryByRole('link', { name: hidden })
            ).toBeNull();
            expect(
                screen.getByRole('navigation', { name: 'Main navigation' })
            ).toBeTruthy();

            await expectNoA11yViolations();
        }
    );
});
