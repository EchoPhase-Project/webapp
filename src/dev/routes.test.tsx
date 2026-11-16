// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { For } from 'solid-js';
import { Route } from '@solidjs/router';
import { screen } from '@solidjs/testing-library';
import { renderRoutes } from '@shared/testing/render-page';
import { fakeApi } from '@shared/testing/fake-api';
import { expectNoA11yViolations } from '@shared/testing/axe';
import { DEV_INDEX, devPages, devRoutes } from './routes';

// The pages that try out shared components; the old experiments (spin,
// drag) only have to render.
const experiments = new Set(['/dev/spin', '/dev/drag']);

// The first import of a page (and its Vite transform) can take seconds.
const loading = { timeout: 10_000 };

function renderDev(path: string) {
    return renderRoutes(
        () => (
            <For each={devRoutes()}>
                {(route) => (
                    <Route path={route.path} component={route.component} />
                )}
            </For>
        ),
        path
    );
}

describe('the dev playground', () => {
    // Loaded first: a page shows at once, not after its frame's heading.
    beforeAll(async () => {
        await Promise.all([
            import('./DevFrame'),
            import('./DevIndexPage'),
            ...devPages().map((page) => page.component.preload()),
        ]);
    }, 60_000);

    it('lists each page once, under /dev, with a title, a line and a component', () => {
        const pages = devPages();
        expect(pages.length).toBeGreaterThan(0);
        for (const page of pages) {
            expect(page.path).toMatch(/^\/dev\/[a-z-]+$/);
            expect(page.title.trim(), page.path).not.toBe('');
            expect(page.description.trim(), page.path).not.toBe('');
            expect(typeof page.component, page.path).toBe('function');
        }
        const paths = pages.map((page) => page.path);
        expect(new Set(paths).size).toBe(paths.length);
        expect(paths).not.toContain(DEV_INDEX);
    });

    it('routes the index and each page', () => {
        expect(devRoutes().map((route) => route.path)).toEqual([
            DEV_INDEX,
            ...devPages().map((page) => page.path),
        ]);
    });

    it('links the index to each page', async () => {
        renderDev(DEV_INDEX);
        await screen.findByRole(
            'heading',
            { level: 1, name: 'Dev playground' },
            loading
        );
        for (const page of devPages())
            expect(
                await screen.findByRole('link', { name: page.title })
            ).toHaveProperty('pathname', page.path);
        await expectNoA11yViolations();
    }, 15_000);

    it.each(devPages().map((page) => [page.path, page] as const))(
        'renders %s',
        async (path, page) => {
            // No page asks the server: an unknown route would answer 404.
            const api = fakeApi({});
            vi.stubGlobal(
                'ResizeObserver',
                class {
                    observe() {}
                    disconnect() {}
                }
            );
            renderDev(path);
            await screen.findByRole(
                'heading',
                { level: 1, name: page.title },
                loading
            );
            expect(
                screen.getByRole('link', { name: 'All playground pages' })
            ).toHaveProperty('pathname', DEV_INDEX);
            // The back link, the header, and the page's own content.
            const frame = document.querySelector('.dev-page');
            expect(frame?.children.length).toBeGreaterThan(2);
            if (!experiments.has(path)) await expectNoA11yViolations();
            expect(api.requests.map((r) => r.url)).toEqual([]);
        },
        15_000
    );
});
