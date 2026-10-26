// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@solidjs/testing-library';
import { fakeApi } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import DocsPage from './DocsPage';
import { ARTICLES, loadArticle, titleOf } from './docs';

const PATTERN = '/docs/:slug?';

describe('DocsPage', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

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
});
