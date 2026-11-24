// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import DocsPage from './DocsPage';
import { ARTICLES, loadArticle, titleOf } from './docs';

const PATTERN = '/docs/:slug?';

describe('DocsPage', () => {
    it('has every article in English, each with a title', async () => {
        for (const slug of ARTICLES) {
            const text = await loadArticle(slug, 'en');
            expect(titleOf(text ?? ''), slug).not.toBe('');
        }
    });

    it('shows an article with the list beside it', async () => {
        fakeApi({});
        renderPage(() => <DocsPage />, '/docs/packages', PATTERN);

        expect(
            await screen.findByRole('heading', { name: 'Packages', level: 1 })
        ).toBeTruthy();
        expect(
            (await screen.findByRole('link', { name: 'Explore' })).getAttribute(
                'href'
            )
        ).toBe('/docs/explore');
    });

    it('says when there is no such article', async () => {
        fakeApi({});
        renderPage(() => <DocsPage />, '/docs/nope', PATTERN);

        expect(await screen.findByText('No such article.')).toBeTruthy();
    });

    it('lists every article on the index', async () => {
        fakeApi({});
        renderPage(() => <DocsPage />, '/docs', PATTERN);

        expect(
            await screen.findByRole('heading', {
                name: 'Documentation',
                level: 1,
            })
        ).toBeTruthy();
        const index = document.querySelector('.docs-index');
        await waitFor(() =>
            expect(index?.querySelectorAll('a')).toHaveLength(ARTICLES.length)
        );
        expect(
            [...(index?.querySelectorAll('a') ?? [])].map((a) =>
                a.getAttribute('href')
            )
        ).toEqual(ARTICLES.map((slug) => `/docs/${slug}`));
    });

    it('keeps a link between articles in the app, but leaves a modified click to the browser', async () => {
        fakeApi({});
        const { history } = renderPage(
            () => <DocsPage />,
            '/docs/packages',
            PATTERN
        );
        await screen.findByRole('heading', { name: 'Packages', level: 1 });
        // The link in the article's Markdown (a plain <a>), not the list's.
        const link = await waitFor(() => {
            const a = document.querySelector<HTMLAnchorElement>(
                '.docs-article a[href="/docs/explore"]'
            );
            if (!a) throw new Error('no link yet');
            return a;
        });

        // Ctrl+click (a new tab): the page does not take it.
        expect(fireEvent.click(link, { ctrlKey: true })).toBe(true);
        expect(history.get()).toBe('/docs/packages');

        expect(fireEvent.click(link)).toBe(false);
        await waitFor(() => expect(history.get()).toBe('/docs/explore'));
    });
});
