// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import ExplorePage from './ExplorePage';

export const pkg = (over: Record<string, unknown> = {}) => ({
    id: 'p1',
    name: 'Guild tools',
    summary: '',
    readme: '# Guild tools\n\nLists the **guilds** of a bot.',
    visibility: 'Public',
    tags: ['discord-bot'],
    latestVersion: 2,
    installs: 7,
    access: 'Read',
    owner: { id: 'u2', userName: 'ann', name: 'Ann' },
    stamp: 's1',
    createdAt: '2026-10-25T10:00:00Z',
    updatedAt: '2026-10-25T10:00:00Z',
    ...over,
});

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
                json(200, [
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

    it('filters by a tag picked on a card', async () => {
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/workflow-packages/explore': () => json(200, [pkg()]),
        });

        renderPage(() => <ExplorePage />);
        fireEvent.click(
            await screen.findByRole('button', { name: '#discord-bot' })
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
        expect(
            await screen.findByRole('button', {
                name: 'Stop filtering by #discord-bot',
            })
        ).toBeTruthy();
    });

    it('lists the caller’s own and shared packages on the second tab', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/workflow-packages/explore': () => json(200, []),
            'GET /api/v1/workflow-packages': () =>
                json(200, [
                    pkg({
                        id: 'p3',
                        name: 'Mine',
                        access: 'Owner',
                        visibility: 'Private',
                    }),
                ]),
        });

        renderPage(() => <ExplorePage />);
        fireEvent.click(
            await screen.findByRole('tab', { name: 'Mine and shared' })
        );

        expect(await screen.findByRole('link', { name: 'Mine' })).toBeTruthy();
        expect(screen.getByText('Private')).toBeTruthy();
    });

    it('publishes the ticked workflows, the first as the main one', async () => {
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/workflow-packages/explore': () => json(200, []),
            'GET /api/v1/workflows': () =>
                json(200, [
                    {
                        id: 'w1',
                        name: 'main flow',
                        active: false,
                        version: 3,
                        contentHash: null,
                        source: null,
                        createdAt: '',
                        updatedAt: '',
                    },
                    {
                        id: 'w2',
                        name: 'on error',
                        active: false,
                        version: 1,
                        contentHash: null,
                        source: null,
                        createdAt: '',
                        updatedAt: '',
                    },
                    {
                        id: 'w3',
                        name: 'installed',
                        active: false,
                        version: 1,
                        contentHash: null,
                        source: { packageId: 'x', version: 1, key: 'k' },
                        createdAt: '',
                        updatedAt: '',
                    },
                ]),
            'POST /api/v1/workflow-packages': () =>
                json(201, pkg({ id: 'p9', access: 'Owner' })),
            'GET /api/v1/workflow-packages/p9': () =>
                json(200, pkg({ id: 'p9', access: 'Owner' })),
        });

        renderPage(() => <ExplorePage />);
        fireEvent.click(
            await screen.findByRole('button', { name: 'Publish workflows' })
        );
        fireEvent.input(screen.getByLabelText('Name'), {
            target: { value: 'Guild tools' },
        });
        fireEvent.input(
            screen.getByLabelText('Tags, separated by commas (up to 10)'),
            {
                target: { value: 'Discord bot, guilds' },
            }
        );
        // Copies installed from others are not offered.
        expect(screen.queryByText('installed')).toBeNull();
        fireEvent.click(await screen.findByLabelText(/on error/));
        fireEvent.click(screen.getByLabelText(/main flow/));
        fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

        await waitFor(() =>
            expect(api.calls('POST /api/v1/workflow-packages')).toHaveLength(1)
        );
        const body = (await api
            .calls('POST /api/v1/workflow-packages')[0]
            .json()) as {
            package: { name: string; tags: string[]; visibility: string };
            publish: { workflows: string[] };
        };
        expect(body.package).toMatchObject({
            name: 'Guild tools',
            tags: ['Discord bot', 'guilds'],
            visibility: 'Private',
        });
        expect(body.publish.workflows).toEqual(['w2', 'w1']);
    });
});
