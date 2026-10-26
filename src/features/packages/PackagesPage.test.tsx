// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { pkg } from './ExplorePage.test';
import PackagesPage from './PackagesPage';

export const workflow = (over: Record<string, unknown> = {}) => ({
    id: 'w1',
    packageId: 'p1',
    key: 'k1',
    name: 'Guild report',
    active: false,
    version: 3,
    contentHash: 'h',
    createdAt: '2026-10-25T10:00:00Z',
    updatedAt: '2026-10-25T10:00:00Z',
    program: {
        blocks: [
            {
                id: 1,
                type: 'WebhookTrigger',
                params: { secret: 'a-secret-of-sixteen' },
            },
            { id: 2, type: 'Print', name: 'say hi', params: {} },
        ],
        connections: [{ from: 1, to: 2, output: 'main' }],
        startIds: [],
        settings: {},
    },
    webhooks: [
        { blockId: 1, path: '/api/v1/hooks/w1/1', respond: 'Immediately' },
    ],
    schedules: [],
    ...over,
});

describe('PackagesPage', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('lists the caller’s packages, where they came from, and those shared with them', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/workflow-packages': () =>
                json(200, [
                    pkg({
                        id: 'p1',
                        name: 'Mine',
                        access: 'Owner',
                        workflows: 3,
                        latestVersion: 0,
                    }),
                    pkg({
                        id: 'p2',
                        name: 'Installed',
                        access: 'Owner',
                        workflows: 2,
                        latestVersion: 0,
                        source: { packageId: 'x', version: 4 },
                    }),
                    pkg({ id: 'p3', name: 'From Ann', access: 'Read' }),
                ]),
        });

        renderPage(() => <PackagesPage />);

        expect(
            (await screen.findByRole('link', { name: 'Mine' })).getAttribute(
                'href'
            )
        ).toBe('/packages/p1/workflows');
        expect(screen.getByText('3 workflows')).toBeTruthy();
        expect(
            screen
                .getByRole('link', { name: 'installed, v4' })
                .getAttribute('href')
        ).toBe('/explore/x');
        expect(
            screen.getByRole('link', { name: 'From Ann' }).getAttribute('href')
        ).toBe('/explore/p3');
    });

    it('offers Explore when there are none', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/workflow-packages': () => json(200, []),
        });

        renderPage(() => <PackagesPage />);

        expect(
            (
                await screen.findByRole('link', { name: 'Find one in Explore' })
            ).getAttribute('href')
        ).toBe('/explore');
    });
});
