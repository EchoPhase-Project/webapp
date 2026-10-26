// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { pageSection } from '@shared/nav/page-section';
import { renderPage } from '@shared/testing/render-page';
import { pkg } from '@features/packages/ExplorePage.test';
import { workflow } from '@features/packages/PackagesPage.test';
import WorkflowDetails from './WorkflowDetails';

const run = (over: Record<string, unknown> = {}) => ({
    runId: 'r1',
    status: 'failed',
    actorId: null,
    workflowId: 'w1',
    programHash: 'h',
    trigger: 'webhook',
    blockCount: 2,
    createdAt: '2026-10-25T10:00:00Z',
    startedAt: '2026-10-25T10:00:01Z',
    finishedAt: '2026-10-25T10:00:02Z',
    durationMs: 1200,
    steps: 2,
    errorCount: 1,
    ...over,
});

const routes = (
    over: Record<string, (r: Request) => Response | Promise<Response>> = {}
) => ({
    ...signedIn,
    'GET /api/v1/workflow-packages/p1': () =>
        json(200, pkg({ access: 'Owner' })),
    'GET /api/v1/workflows/w1': () => json(200, workflow()),
    'GET /api/v1/workflows/w1/runs': () =>
        json(200, { data: [run()], nextCursor: null }),
    'GET /api/v1/workflows/w1/versions': () =>
        json(200, [
            {
                version: 3,
                name: 'Guild report',
                contentHash: 'h3',
                parentVersion: 2,
                restoredFrom: null,
                savedBy: null,
                createdAt: '2026-10-25T10:00:00Z',
            },
            {
                version: 2,
                name: 'Guild report',
                contentHash: 'h2',
                parentVersion: 1,
                restoredFrom: null,
                savedBy: null,
                createdAt: '2026-10-24T10:00:00Z',
            },
        ]),
    ...over,
});

describe('WorkflowDetails', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('shows what it is: its blocks only; its webhooks and schedules have tabs', async () => {
        fakeApi(routes());
        renderPage(() => <WorkflowDetails id="w1" packageId="p1" />);

        expect(
            await screen.findByRole('heading', {
                name: 'Guild report',
                level: 1,
            })
        ).toBeTruthy();
        expect(screen.getByText('WebhookTrigger')).toBeTruthy();
        expect(screen.getByText('say hi')).toBeTruthy();
        expect(screen.queryByText(/\/api\/v1\/hooks\/w1\/1$/)).toBeNull();
        expect(
            await screen.findByRole('link', { name: 'Webhooks' })
        ).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Schedules' })).toBeTruthy();
        // Back to its package, by name.
        expect(
            (
                await screen.findByRole('link', { name: /Guild tools/ })
            ).getAttribute('href')
        ).toBe('/packages/p1/workflows');
    });

    it('has no webhooks tab without a WebhookTrigger', async () => {
        fakeApi(
            routes({
                'GET /api/v1/workflows/w1': () =>
                    json(200, workflow({ webhooks: [] })),
            })
        );
        renderPage(() => <WorkflowDetails id="w1" packageId="p1" />);

        expect(
            await screen.findByRole('link', { name: 'Schedules' })
        ).toBeTruthy();
        expect(screen.queryByRole('link', { name: 'Webhooks' })).toBeNull();
    });

    it('lists the webhooks: the secret only when asked; a new one from the edit dialog', async () => {
        const api = fakeApi(
            routes({
                'PUT /api/v1/workflows/w1': () =>
                    json(200, workflow({ version: 4 })),
            })
        );
        renderPage(() => (
            <WorkflowDetails id="w1" packageId="p1" tab="webhooks" />
        ));

        expect(
            await screen.findByText(/\/api\/v1\/hooks\/w1\/1$/)
        ).toBeTruthy();
        expect(screen.getByText('202 at once')).toBeTruthy();
        expect(screen.queryByText('a-secret-of-sixteen')).toBeNull();
        fireEvent.click(
            screen.getByRole('button', { name: 'Show the secret' })
        );
        expect(screen.getByText('a-secret-of-sixteen')).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', { name: 'Edit the webhook' })
        );
        fireEvent.click(await screen.findByLabelText(/New secret/));
        fireEvent.click(screen.getByLabelText(/The run’s output/));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() =>
            expect(api.calls('PUT /api/v1/workflows/w1')).toHaveLength(1)
        );
        const body = (await api
            .calls('PUT /api/v1/workflows/w1')[0]
            .json()) as {
            version: number;
            program: {
                blocks: { params: { secret?: string; respond?: string } }[];
            };
        };
        expect(body.version).toBe(3);
        const params = body.program.blocks[0].params;
        expect(params.respond).toBe('OnFinish');
        expect(params.secret).not.toBe('a-secret-of-sixteen');
        expect((params.secret ?? '').length).toBeGreaterThanOrEqual(16);
    });

    it('adds a schedule that starts where the other triggers do', async () => {
        const api = fakeApi(
            routes({
                'PUT /api/v1/workflows/w1': () =>
                    json(200, workflow({ version: 4 })),
            })
        );
        renderPage(() => (
            <WorkflowDetails id="w1" packageId="p1" tab="schedules" />
        ));
        expect(await screen.findByText('No schedules.')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Add a schedule' }));
        fireEvent.input(await screen.findByLabelText(/^Cron/), {
            target: { value: '0 9 * * 1-5' },
        });
        fireEvent.input(screen.getByLabelText(/^Time zone/), {
            target: { value: 'Europe/Chisinau' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() =>
            expect(api.calls('PUT /api/v1/workflows/w1')).toHaveLength(1)
        );
        const body = (await api
            .calls('PUT /api/v1/workflows/w1')[0]
            .json()) as {
            program: {
                blocks: {
                    id: number;
                    type: string;
                    params: { cron?: string };
                }[];
                connections: { from: number; to: number }[];
                settings: { timeZone?: string };
            };
        };
        const added = body.program.blocks.find(
            (b) => b.type === 'ScheduleTrigger'
        );
        expect(added).toMatchObject({ id: 3, params: { cron: '0 9 * * 1-5' } });
        expect(body.program.connections).toContainEqual({
            from: 3,
            to: 2,
            output: 'main',
        });
        expect(body.program.settings.timeZone).toBe('Europe/Chisinau');
    });

    it('runs it with a JSON input, refusing what is not JSON', async () => {
        const api = fakeApi(
            routes({
                'POST /api/v1/workflows/w1/runs': () =>
                    json(202, { runId: 'r9', status: 'queued' }),
            })
        );
        renderPage(() => <WorkflowDetails id="w1" packageId="p1" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Run now' }));

        const input = screen.getByLabelText(/Input \(JSON/);
        fireEvent.input(input, { target: { value: '{nope' } });
        fireEvent.click(screen.getByRole('button', { name: 'Run' }));
        expect(await screen.findByRole('alert')).toBeTruthy();
        expect(api.calls('POST /api/v1/workflows/w1/runs')).toHaveLength(0);

        fireEvent.input(input, { target: { value: '{"user": "ann"}' } });
        fireEvent.click(screen.getByRole('button', { name: 'Run' }));
        await waitFor(() =>
            expect(api.calls('POST /api/v1/workflows/w1/runs')).toHaveLength(1)
        );
        expect(
            await api.calls('POST /api/v1/workflows/w1/runs')[0].json()
        ).toEqual({ input: { user: 'ann' } });
    });

    it('lists its runs and opens one to its result', async () => {
        fakeApi(
            routes({
                'GET /api/v1/blocks/runs/r1': () =>
                    json(200, {
                        run: run(),
                        result: { errors: [{ block: 2, message: 'boom' }] },
                    }),
            })
        );
        renderPage(() => <WorkflowDetails id="w1" packageId="p1" tab="runs" />);

        const row = await screen.findByRole('button', { name: /failed/ });
        expect(row.textContent).toContain('Webhook');
        expect(row.textContent).toContain('1.2 sec');
        fireEvent.click(row);
        expect(await screen.findByText(/"boom"/)).toBeTruthy();
    });

    it('restores an old version after asking', async () => {
        const api = fakeApi(
            routes({
                'POST /api/v1/workflows/w1/versions/2/restore': () =>
                    json(200, workflow({ version: 4 })),
            })
        );
        renderPage(() => (
            <WorkflowDetails id="w1" packageId="p1" tab="versions" />
        ));

        fireEvent.click(await screen.findByRole('button', { name: 'Restore' }));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(dialog.querySelector('.btn-danger') as HTMLElement);

        await waitFor(() =>
            expect(
                api.calls('POST /api/v1/workflows/w1/versions/2/restore')
            ).toHaveLength(1)
        );
        expect(
            await api
                .calls('POST /api/v1/workflows/w1/versions/2/restore')[0]
                .json()
        ).toEqual({ currentVersion: 3 });
    });

    it('gives the navigation its package’s group, then its own parts', async () => {
        fakeApi(routes());
        renderPage(() => <WorkflowDetails id="w1" packageId="p1" />);

        await waitFor(() =>
            expect(pageSection()?.sections.map((s) => s.label)).toEqual([
                'Guild tools',
                'Guild report',
            ])
        );
        const own = pageSection()?.sections[1].items ?? [];
        expect(own.map((i) => i.href)).toEqual([
            '/packages/p1/workflows/w1',
            '/packages/p1/workflows/w1/webhooks',
            '/packages/p1/workflows/w1/schedules',
            '/packages/p1/workflows/w1/runs',
            '/packages/p1/workflows/w1/versions',
        ]);
        // The overview is current only on itself.
        expect(own[0].end).toBe(true);
    });
});
