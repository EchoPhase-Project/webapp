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
import { lazy, type ParentProps } from 'solid-js';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { A, Route } from '@solidjs/router';
import { renderRoutes } from '@shared/testing/render-page';
import { expectNoA11yViolations } from '@shared/testing/axe';
import {
    startErrorReporting,
    stopErrorReporting,
} from '@shared/consent/error-reporting';
import PageErrorBoundary, { isChunkLoadError } from './PageErrorBoundary';

const captureException = vi.fn();
vi.mock('@sentry/browser', () => ({
    init: vi.fn(),
    close: vi.fn(),
    captureException,
}));

// The layout's frame around the page, as in Layout.tsx.
function Shell(props: ParentProps<{ details?: boolean }>) {
    return (
        <>
            <header>
                <A href="/fine">Fine</A>
                <A href="/fine?tab=2">Fine, tab 2</A>
            </header>
            <main>
                <PageErrorBoundary details={props.details}>
                    {props.children}
                </PageErrorBoundary>
            </main>
            <footer>Footer</footer>
        </>
    );
}

const Fine = () => <h1>Fine page</h1>;

function render(
    broken: () => never | Element,
    options: { path?: string; details?: boolean } = {}
) {
    return renderRoutes(
        () => (
            <Route
                component={(props: ParentProps) => (
                    <Shell details={options.details ?? false}>
                        {props.children}
                    </Shell>
                )}
            >
                <Route path="/broken" component={broken} />
                <Route path="/fine" component={Fine} />
            </Route>
        ),
        options.path ?? '/broken'
    );
}

const boom = () => {
    throw new Error('boom');
};

describe('PageErrorBoundary', () => {
    let logged: MockInstance<typeof console.error>;
    beforeEach(() => {
        logged = vi.spyOn(console, 'error').mockImplementation(() => {});
        captureException.mockReset();
    });
    afterEach(async () => {
        logged.mockRestore();
        await stopErrorReporting();
    });

    it('shows the fallback in place of the page and keeps the layout', async () => {
        render(boom);

        expect(
            await screen.findByRole('heading', {
                level: 1,
                name: 'Something went wrong',
            })
        ).toBeTruthy();
        expect(screen.getByRole('banner')).toBeTruthy();
        expect(screen.getByRole('contentinfo').textContent).toBe('Footer');
        expect(
            screen
                .getByRole('link', { name: 'Go to the home page' })
                .getAttribute('href')
        ).toBe('/');
        expect(logged).toHaveBeenCalledWith(expect.any(Error));
        await expectNoA11yViolations();
    });

    it('renders the page again on "Try again"', async () => {
        let calls = 0;
        render(() => {
            calls += 1;
            if (calls === 1) throw new Error('once');
            return (<h1>Works now</h1>) as Element;
        });

        fireEvent.click(
            await screen.findByRole('button', { name: 'Try again' })
        );
        expect(
            await screen.findByRole('heading', { name: 'Works now' })
        ).toBeTruthy();
    });

    it('starts clean at another address', async () => {
        render(boom);
        await screen.findByRole('heading', { name: 'Something went wrong' });

        fireEvent.click(screen.getByRole('link', { name: 'Fine' }));
        expect(
            await screen.findByRole('heading', { name: 'Fine page' })
        ).toBeTruthy();
        expect(screen.queryByText('Something went wrong')).toBeNull();
    });

    it('starts clean when only the query changes', async () => {
        let broken = true;
        renderRoutes(
            () => (
                <Route
                    component={(props: ParentProps) => (
                        <Shell>{props.children}</Shell>
                    )}
                >
                    <Route
                        path="/fine"
                        component={() => {
                            if (broken) throw new Error('first tab');
                            return <h1>Second tab</h1>;
                        }}
                    />
                </Route>
            ),
            '/fine'
        );
        await screen.findByRole('heading', { name: 'Something went wrong' });

        broken = false;
        fireEvent.click(screen.getByRole('link', { name: 'Fine, tab 2' }));
        expect(
            await screen.findByRole('heading', { name: 'Second tab' })
        ).toBeTruthy();
    });

    it('reports the error once when the visitor allowed error reports', async () => {
        await startErrorReporting(() =>
            Promise.resolve({ sentryDsn: 'http://key@host/2' })
        );
        render(boom);
        await screen.findByRole('heading', { name: 'Something went wrong' });

        await waitFor(() => expect(captureException).toHaveBeenCalledTimes(1));
        expect(captureException).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'boom' })
        );
    });

    it('reports nothing without the consent', async () => {
        render(boom);
        await screen.findByRole('heading', { name: 'Something went wrong' });
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(captureException).not.toHaveBeenCalled();
    });

    it('offers a reload when a lazy page chunk is gone', async () => {
        const Gone = lazy(() =>
            Promise.reject(
                new TypeError(
                    'Failed to fetch dynamically imported module: /assets/Gone-abc.js'
                )
            )
        );
        render(() => (<Gone />) as Element);

        expect(
            await screen.findByRole('heading', {
                level: 1,
                name: 'A new version is available',
            })
        ).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Reload the page' })
        ).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
        await expectNoA11yViolations();
    });

    it('shows the message and stack only with details (in development)', async () => {
        render(boom, { details: true });
        const details = await screen.findByRole('region', {
            name: 'Error details',
        });
        expect(details.textContent).toContain('boom');
        await expectNoA11yViolations();
    });

    it('hides the details without them (in production)', async () => {
        render(boom);
        await screen.findByRole('heading', { name: 'Something went wrong' });
        expect(
            screen.queryByRole('region', { name: 'Error details' })
        ).toBeNull();
    });
});

describe('isChunkLoadError', () => {
    it('knows the words of each browser', () => {
        for (const message of [
            'Failed to fetch dynamically imported module: /a.js',
            'error loading dynamically imported module: /a.js',
            'Importing a module script failed.',
        ]) {
            expect(isChunkLoadError(new TypeError(message))).toBe(true);
        }
        expect(isChunkLoadError(new Error('boom'))).toBe(false);
        expect(isChunkLoadError('Importing a module script failed.')).toBe(
            false
        );
    });
});
