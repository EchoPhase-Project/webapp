// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { workflow } from '@features/workflows/WorkflowsPage.test';
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

    it('shows what it is: its blocks and where its webhook listens', async () => {
        fakeApi(routes());
        renderPage(() => <WorkflowDetails id="w1" />);

        expect(
            await screen.findByRole('heading', {
                name: 'Guild report',
                level: 1,
            })
        ).toBeTruthy();
        expect(screen.getByText('WebhookTrigger')).toBeTruthy();
        expect(screen.getByText('say hi')).toBeTruthy();
        expect(screen.getByText(/\/api\/v1\/hooks\/w1\/1$/)).toBeTruthy();
    });

    it('runs it with a JSON input, refusing what is not JSON', async () => {
        const api = fakeApi(
            routes({
                'POST /api/v1/workflows/w1/runs': () =>
                    json(202, { runId: 'r9', status: 'queued' }),
            })
        );
        renderPage(() => <WorkflowDetails id="w1" />);
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
        renderPage(() => <WorkflowDetails id="w1" />);
        fireEvent.click(await screen.findByRole('tab', { name: 'Runs' }));

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
        renderPage(() => <WorkflowDetails id="w1" />);
        fireEvent.click(await screen.findByRole('tab', { name: 'Versions' }));

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
});
