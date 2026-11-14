// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { sessionClient } from '@shared/api/session-provider';
import { packageKeys } from './api/packages';
import ExplorePage from './ExplorePage';
import { parseQuery, queryOf } from './components/PackageSearch';
import { pkg } from './fixtures';

const page = (data: unknown[], nextCursor: string | null = null) =>
    json(200, { data, nextCursor, hasMore: nextCursor !== null });

describe('ExplorePage', () => {
    afterEach(() => {
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

    it('cancels the request for the old search and starts the new one', async () => {
        const api = fakeApi({
            ...signedIn,
            // The first search never answers: it is still out when the
            // second starts.
            'GET /api/v1/workflow-packages/explore': (request) =>
                new URL(request.url).searchParams.get('q') === 'raid'
                    ? page([pkg({ id: 'p2', name: 'Raid bot' })])
                    : new Promise<Response>(() => {}),
        });
        const explore = () =>
            api.calls('GET /api/v1/workflow-packages/explore');

        renderPage(() => <ExplorePage />);
        await waitFor(() => expect(explore()).toHaveLength(1));
        fireEvent.input(screen.getByLabelText('Search packages'), {
            target: { value: 'raid' },
        });

        expect(
            await screen.findByRole('link', { name: 'Raid bot' })
        ).toBeTruthy();
        expect(explore()).toHaveLength(2);
        const old = sessionClient()
            .getQueryCache()
            .find({ queryKey: packageKeys.explore('', ''), exact: true });
        expect(old?.state.fetchStatus).toBe('idle');
        expect(old?.state.data).toBeUndefined();
        expect(new URL(explore()[1].url).searchParams.get('cursor')).toBeNull();
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
