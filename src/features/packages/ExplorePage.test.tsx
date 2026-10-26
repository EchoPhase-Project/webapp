// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import ExplorePage from './ExplorePage';
import { parseQuery, queryOf } from './components/PackageSearch';

export const pkg = (over: Record<string, unknown> = {}) => ({
    id: 'p1',
    name: 'Guild tools',
    summary: '',
    readme: '# Guild tools\n\nLists the **guilds** of a bot.',
    visibility: 'Public',
    tags: ['discord-bot'],
    latestVersion: 2,
    installs: 7,
    workflows: 0,
    errorWorkflow: null,
    source: null,
    access: 'Read',
    owner: { id: 'u2', userName: 'ann', name: 'Ann' },
    stamp: 's1',
    createdAt: '2026-10-25T10:00:00Z',
    updatedAt: '2026-10-25T10:00:00Z',
    ...over,
});

const page = (data: unknown[], nextCursor: string | null = null) =>
    json(200, { data, nextCursor, hasMore: nextCursor !== null });

describe('ExplorePage', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        sessionStorage.clear();
    });

    it('shows public packages as cards, the README when there is no summary', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/workflow-packages/explore': () =>
                page([
                    pkg(),
                    pkg({
                        id: 'p2',
                        name: 'Raid bot',
                        summary: 'Pings raiders.',
                    }),
                ]),
        });

        renderPage(() => <ExplorePage />);

        expect(
            await screen.findByRole('link', { name: 'Guild tools' })
        ).toBeTruthy();
        expect(screen.getByText('Lists the guilds of a bot.')).toBeTruthy();
        expect(screen.getByText('Pings raiders.')).toBeTruthy();
        expect(screen.getAllByText('7 installs')).toHaveLength(2);
    });

    it('loads the next page with the cursor of the last', async () => {
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/workflow-packages/explore': (request) =>
                new URL(request.url).searchParams.get('cursor') === 'c1'
                    ? page([pkg({ id: 'p2', name: 'Second page' })])
                    : page([pkg()], 'c1'),
        });

        renderPage(() => <ExplorePage />);
        fireEvent.click(
            await screen.findByRole('button', { name: 'Show more' })
        );

        expect(
            await screen.findByRole('link', { name: 'Second page' })
        ).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Guild tools' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
        expect(api.calls('GET /api/v1/workflow-packages/explore')).toHaveLength(
            2
        );
    });

    it('filters by a tag picked on a card', async () => {
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/workflow-packages/explore': () => page([pkg()]),
        });

        renderPage(() => <ExplorePage />);
        fireEvent.click(
            await screen.findByRole('button', { name: 'discord-bot' })
        );

        await waitFor(() =>
            expect(
                api
                    .calls('GET /api/v1/workflow-packages/explore')
                    .some(
                        (r) =>
                            new URL(r.url).searchParams.get('tag') ===
                            'discord-bot'
                    )
            ).toBe(true)
        );
        // In the search line, as a qualifier.
        expect(
            screen.getByLabelText<HTMLInputElement>('Search packages').value
        ).toBe('tag:discord-bot');
    });

    it('reads tag: out of the search line', () => {
        expect(parseQuery('guild tag:Discord-Bot report')).toEqual({
            tag: 'discord-bot',
            words: 'guild report',
        });
        expect(queryOf('raid', 'pings')).toBe('tag:raid pings');
    });

    it('suggests the filters, then the tags in use, from the server', async () => {
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/workflow-packages/explore': () => page([pkg()]),
            'GET /api/v1/workflow-packages/explore/tags': () =>
                json(200, [{ tag: 'discord-bot', packages: 3 }]),
        });
        renderPage(() => <ExplorePage />);

        const search = await screen.findByRole('combobox', {
            name: 'Search packages',
        });
        fireEvent.focus(search);
        expect(screen.getByRole('option', { name: /tag:/ })).toBeTruthy();

        fireEvent.keyDown(search, { key: 'Enter' });
        expect((search as HTMLInputElement).value).toBe('tag:');
        expect(
            await screen.findByRole('option', { name: /discord-bot.*3/ })
        ).toBeTruthy();
        expect(
            api
                .calls('GET /api/v1/workflow-packages/explore/tags')
                .some((r) => new URL(r.url).searchParams.get('q') === null)
        ).toBe(true);

        fireEvent.keyDown(search, { key: 'Enter' });
        expect((search as HTMLInputElement).value).toBe('tag:discord-bot ');
    });
});
