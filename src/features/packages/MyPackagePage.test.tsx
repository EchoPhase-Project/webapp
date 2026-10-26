// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { pageSection } from '@shared/nav/page-section';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { pkg } from './ExplorePage.test';
import { workflow } from './PackagesPage.test';
import MyPackagePage from './MyPackagePage';

const PATTERN = '/packages/:id/:section?';

const caller = workflow({
    id: 'w1',
    key: 'k1',
    name: 'main',
    program: {
        blocks: [
            { id: 1, type: 'ManualTrigger', params: {} },
            { id: 2, type: 'ExecuteWorkflow', params: { workflow: 'k2' } },
        ],
        connections: [{ from: 1, to: 2 }],
    },
    webhooks: [],
});
const called = workflow({
    id: 'w2',
    key: 'k2',
    name: 'helper',
    program: { blocks: [{ id: 1, type: 'ManualTrigger', params: {} }] },
    webhooks: [],
});
const summary = (w: ReturnType<typeof workflow>) => {
    const {
        program: _program,
        webhooks: _webhooks,
        schedules: _schedules,
        ...rest
    } = w;
    return rest;
};

const routes = (
    over: Record<string, (r: Request) => Response | Promise<Response>> = {}
) => ({
    ...signedIn,
    'GET /api/v1/workflow-packages/p1': () =>
        json(200, pkg({ access: 'Owner', latestVersion: 0, workflows: 2 })),
    'GET /api/v1/workflows': () =>
        json(200, [summary(caller), summary(called)]),
    'GET /api/v1/workflows/w1': () => json(200, caller),
    'GET /api/v1/workflows/w2': () => json(200, called),
    ...over,
});

describe('MyPackagePage', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('lists its workflows and gives the navigation its group', async () => {
        fakeApi(routes());
        renderPage(() => <MyPackagePage />, '/packages/p1/workflows', PATTERN);

        expect(
            (await screen.findByRole('link', { name: 'main' })).getAttribute(
                'href'
            )
        ).toBe('/packages/p1/workflows/w1');
        await waitFor(() =>
            expect(pageSection()?.section.label).toBe('Guild tools')
        );
        expect(pageSection()?.after).toBe('/packages');
        expect(pageSection()?.section.items?.map((i) => i.href)).toEqual([
            '/packages/p1/workflows',
            '/packages/p1/runs',
            '/packages/p1/settings',
        ]);
    });

    it('turns a workflow on: fetches it, then saves it over the version it read', async () => {
        const api = fakeApi(
            routes({
                'PUT /api/v1/workflows/w1': () =>
                    json(200, { ...caller, active: true }),
            })
        );
        renderPage(() => <MyPackagePage />, '/packages/p1/workflows', PATTERN);

        fireEvent.click((await screen.findAllByRole('switch'))[0]);

        await waitFor(() =>
            expect(api.calls('PUT /api/v1/workflows/w1')).toHaveLength(1)
        );
        expect(
            await api.calls('PUT /api/v1/workflows/w1')[0].json()
        ).toMatchObject({ active: true, version: 3 });
    });

    it('chooses the error workflow, keeping the rest of the package as it is', async () => {
        const api = fakeApi(
            routes({
                'GET /api/v1/workflow-packages/p1/shares': () => json(200, []),
                'PUT /api/v1/workflow-packages/p1': () =>
                    json(200, pkg({ access: 'Owner', errorWorkflow: 'k2' })),
            })
        );
        renderPage(() => <MyPackagePage />, '/packages/p1/settings', PATTERN);

        const select = await screen.findByLabelText<HTMLSelectElement>(
            /Workflow to start when an automatic run/
        );
        await waitFor(() => expect(select.options).toHaveLength(3));
        fireEvent.change(select, { target: { value: 'k2' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() =>
            expect(api.calls('PUT /api/v1/workflow-packages/p1')).toHaveLength(
                1
            )
        );
        expect(
            await api.calls('PUT /api/v1/workflow-packages/p1')[0].json()
        ).toMatchObject({
            name: 'Guild tools',
            visibility: 'Public',
            errorWorkflow: 'k2',
            expectedStamp: 's1',
        });
    });

    it('will not publish a workflow without the one it calls', async () => {
        const api = fakeApi(
            routes({
                'GET /api/v1/workflow-packages/p1/shares': () => json(200, []),
                'POST /api/v1/workflow-packages/p1/versions': () =>
                    json(201, {
                        version: 1,
                        changelog: '',
                        contentHash: 'h',
                        createdAt: '2026-10-26T10:00:00Z',
                    }),
            })
        );
        renderPage(() => <MyPackagePage />, '/packages/p1/settings', PATTERN);

        const open = await screen.findByRole('button', { name: 'New version' });
        await waitFor(() => expect(open).toHaveProperty('disabled', false));
        fireEvent.click(open);
        fireEvent.click(await screen.findByLabelText(/helper/));

        expect(
            await screen.findByText('“main” calls “helper”: choose it too.')
        ).toBeTruthy();
        const publish = screen.getByRole('button', { name: 'Publish' });
        expect(publish).toHaveProperty('disabled', true);

        fireEvent.click(screen.getByLabelText(/helper/));
        await waitFor(() => expect(publish).toHaveProperty('disabled', false));
        fireEvent.click(publish);
        await waitFor(() =>
            expect(
                api.calls('POST /api/v1/workflow-packages/p1/versions')
            ).toHaveLength(1)
        );
        expect(
            await api
                .calls('POST /api/v1/workflow-packages/p1/versions')[0]
                .json()
        ).toMatchObject({ workflows: ['w1', 'w2'] });
    });
});
