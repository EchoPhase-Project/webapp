// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import WorkflowsPage from './WorkflowsPage';

export const workflow = (over: Record<string, unknown> = {}) => ({
    id: 'w1',
    name: 'Guild report',
    active: false,
    version: 3,
    contentHash: 'h',
    source: null,
    createdAt: '2026-10-25T10:00:00Z',
    updatedAt: '2026-10-25T10:00:00Z',
    program: {
        blocks: [
            { id: 1, type: 'WebhookTrigger', params: {} },
            { id: 2, type: 'Print', name: 'say hi', params: {} },
        ],
        connections: [{ from: 1, to: 2 }],
    },
    webhooks: [{ blockId: 1, path: '/api/v1/hooks/w1/1' }],
    schedules: [],
    ...over,
});

describe('WorkflowsPage', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('lists the workflows, marking those installed from a package', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/workflows': () =>
                json(200, [
                    workflow(),
                    workflow({
                        id: 'w2',
                        name: 'From Explore',
                        source: { packageId: 'p1', version: 2, key: 'k' },
                    }),
                ]),
        });

        renderPage(() => <WorkflowsPage />);

        expect(
            await screen.findByRole('link', { name: 'Guild report' })
        ).toBeTruthy();
        expect(
            screen
                .getByRole('link', { name: 'From Explore' })
                .getAttribute('href')
        ).toBe('/workflows/w2');
        expect(screen.getAllByText('installed')).toHaveLength(1);
    });

    it('turns one on: fetches it, then saves it over the version it read', async () => {
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/workflows': () => json(200, [workflow()]),
            'GET /api/v1/workflows/w1': () => json(200, workflow()),
            'PUT /api/v1/workflows/w1': () =>
                json(200, workflow({ active: true, version: 3 })),
        });

        renderPage(() => <WorkflowsPage />);
        fireEvent.click(await screen.findByRole('switch'));

        await waitFor(() =>
            expect(api.calls('PUT /api/v1/workflows/w1')).toHaveLength(1)
        );
        const body = (await api
            .calls('PUT /api/v1/workflows/w1')[0]
            .json()) as { active: boolean; version: number };
        expect(body).toMatchObject({ active: true, version: 3 });
    });

    it('offers Explore when there are none', async () => {
        fakeApi({ ...signedIn, 'GET /api/v1/workflows': () => json(200, []) });

        renderPage(() => <WorkflowsPage />);

        expect(
            (
                await screen.findByRole('link', { name: 'Find one in Explore' })
            ).getAttribute('href')
        ).toBe('/explore');
    });
});
