// @vitest-environment jsdom
import { createSignal, Show } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { sessionClient } from '@shared/api/session-provider';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage, withSession } from '@shared/testing/render-page';
import { expectNoA11yViolations } from '@shared/testing/axe';
import type { CursorListData } from '@shared/api/paged-list';
import type { BlockRun } from '@shared/api/types';
import {
    patchRunBlockFailed,
    patchRunLists,
    refreshRunLists,
    runKeys,
    type RunLive,
} from '@features/packages/api/runs';
import RunDialog from './components/RunDialog';
import RunList from './components/RunList';
import {
    followRunEvents,
    runBlockFailedOf,
    runCompletedOf,
    runProgressOf,
    type RunEventFeed,
} from './run-events';

const WORKFLOW_RUNS = 'GET /api/v1/workflows/w1/runs';
const PACKAGE_RUNS = 'GET /api/v1/workflow-packages/p1/runs';

const run = (runId: string, over: Record<string, unknown> = {}) => ({
    runId,
    status: 'succeeded',
    actorId: null,
    workflowId: 'w1',
    programHash: 'h',
    trigger: 'manual',
    blockCount: 2,
    createdAt: '2026-10-25T10:00:00Z',
    startedAt: '2026-10-25T10:00:01Z',
    finishedAt: '2026-10-25T10:00:02Z',
    durationMs: 1200,
    steps: 2,
    errorCount: 0,
    ...over,
});

/**
 * The runs of w1 as the server pages them (cursor c1, c2, …), newest
 * first; `runs` can change between requests.
 */
function server(pages: ReturnType<typeof run>[][]) {
    return (request: Request) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        const i = cursor ? Number(cursor.slice(1)) : 0;
        return json(200, {
            data: pages[i] ?? [],
            nextCursor: i < pages.length - 1 ? `c${i + 1}` : null,
        });
    };
}

function feed() {
    const handlers = new Map<string, (e: { [key: string]: unknown }) => void>();
    const value: RunEventFeed = {
        subscribe: (type, handler) => {
            handlers.set(type, handler);
            return () => handlers.delete(type);
        },
    };
    return {
        value,
        handlers,
        emit: (type: string, e: { [key: string]: unknown } = {}) =>
            handlers.get(type)?.({ type, ...e }),
    };
}

/** Requests of a route without a cursor: first pages. */
const firstPages = (api: ReturnType<typeof fakeApi>, key: string) =>
    api.calls(key).filter((r) => !new URL(r.url).searchParams.has('cursor'))
        .length;

const rows = () =>
    Array.from(document.querySelectorAll('.workflow-run-row .pill')).map(
        (e) => e.textContent
    );

const completed = {
    runId: 'r5',
    status: 'failed',
    durationMs: 4000,
    errorCount: 2,
};

/** A completed event as the server sends it (BlockRunEventsNotifier). */
const completedEvent = (over: Record<string, unknown> = {}) => ({
    run: { ...completed, ...over },
});

describe('runCompletedOf', () => {
    it('reads the run under `run`, as the server sends it', () => {
        expect(
            runCompletedOf({ type: 'block_run.completed', ...completedEvent() })
        ).toEqual(completed);
        // Both counts may be null, as in the API's run.
        expect(
            runCompletedOf(
                completedEvent({ durationMs: null, errorCount: null })
            )
        ).toEqual({ ...completed, durationMs: null, errorCount: null });
    });

    it('answers undefined for a field missing, of another type or renamed, or a flat event', () => {
        const { errorCount: _, ...missing } = completed;
        expect(runCompletedOf({ run: missing })).toBeUndefined();
        expect(
            runCompletedOf(completedEvent({ durationMs: '4000' }))
        ).toBeUndefined();
        expect(runCompletedOf(completedEvent({ runId: 5 }))).toBeUndefined();
        const { status, ...rest } = completed;
        expect(
            runCompletedOf({ run: { ...rest, state: status } })
        ).toBeUndefined();
        // The shape before: the fields at the top, not under `run`.
        expect(runCompletedOf({ type: 'x', ...completed })).toBeUndefined();
    });
});

describe('runProgressOf and runBlockFailedOf', () => {
    const progress = { runId: 'r5', steps: 7, blockId: 3, blockType: 'Http' };
    const failed = {
        runId: 'r5',
        blockId: 3,
        errorType: 'Timeout',
        message: 'no answer',
    };

    it('read the run under `run`, as the server sends it', () => {
        expect(runProgressOf({ run: progress })).toEqual(progress);
        expect(runBlockFailedOf({ run: failed })).toEqual(failed);
    });

    it('answer undefined for a field missing or of another type, or a flat event', () => {
        expect(
            runProgressOf({ run: { ...progress, steps: '7' } })
        ).toBeUndefined();
        const { blockType: _, ...noType } = progress;
        expect(runProgressOf({ run: noType })).toBeUndefined();
        expect(runProgressOf({ ...progress })).toBeUndefined();
        expect(
            runBlockFailedOf({ run: { ...failed, blockId: '3' } })
        ).toBeUndefined();
        const { message: __, ...noMessage } = failed;
        expect(runBlockFailedOf({ run: noMessage })).toBeUndefined();
    });
});

describe('run events', () => {
    afterEach(() => {
        sessionStorage.clear();
        vi.restoreAllMocks();
    });

    it('started: one first-page request for an open run list, the new run on top', async () => {
        const pages = [[run('r2'), run('r1')], [run('r0')]];
        const api = fakeApi({ ...signedIn, [WORKFLOW_RUNS]: server(pages) });
        const { value, emit } = feed();
        renderPage(() => <RunList workflowId="w1" />);
        followRunEvents(value, sessionClient());
        fireEvent.click(
            await screen.findByRole('button', { name: 'Show older' })
        );
        await waitFor(() => expect(rows()).toHaveLength(3));

        pages[0] = [run('r3', { status: 'queued' }), run('r2'), run('r1')];
        emit('block_run.started', { runId: 'r3', status: 'queued' });

        await waitFor(() => expect(rows()).toHaveLength(4));
        expect(rows()[0]).toBe('queued');
        expect(firstPages(api, WORKFLOW_RUNS)).toBe(2);
        expect(api.calls(WORKFLOW_RUNS)).toHaveLength(3);
    });

    it('started: a closed run list is not fetched, but is when opened again', async () => {
        const api = fakeApi({
            ...signedIn,
            [WORKFLOW_RUNS]: server([[run('r1')]]),
        });
        const { value, emit } = feed();
        const [shown, show] = createSignal(true);
        renderPage(() => (
            <Show when={shown()}>
                <RunList workflowId="w1" />
            </Show>
        ));
        const client = sessionClient();
        followRunEvents(value, client);
        await waitFor(() => expect(rows()).toHaveLength(1));
        show(false);

        emit('block_run.started', { runId: 'r2', status: 'queued' });
        await waitFor(() =>
            expect(
                client.getQueryState(runKeys.ofWorkflow('w1'))?.isInvalidated
            ).toBe(true)
        );
        expect(api.calls(WORKFLOW_RUNS)).toHaveLength(1);

        show(true);
        await waitFor(() => expect(api.calls(WORKFLOW_RUNS)).toHaveLength(2));
    });

    it('completed: patched from the event on the third loaded page, no request; the open details asked for once it is done', async () => {
        const api = fakeApi({
            ...signedIn,
            [WORKFLOW_RUNS]: server([
                [run('r7'), run('r6')],
                [run('r5', { status: 'running' })],
                [run('r4', { status: 'running' })],
            ]),
            'GET /api/v1/blocks/runs/r4': () =>
                json(200, { run: run('r4'), result: { done: true } }),
        });
        const { value, emit } = feed();
        renderPage(() => <RunList workflowId="w1" />);
        followRunEvents(value, sessionClient());
        for (const n of [3, 4]) {
            fireEvent.click(
                await screen.findByRole('button', { name: 'Show older' })
            );
            await waitFor(() => expect(rows()).toHaveLength(n));
        }
        // r4 open while it runs: no result yet, so its details wait.
        fireEvent.click(screen.getAllByRole('button', { name: /running/ })[1]);
        await screen.findByText(
            'Not done yet: its result shows when it is done.'
        );
        expect(api.calls('GET /api/v1/blocks/runs/r4')).toHaveLength(0);
        const lists = api.calls(WORKFLOW_RUNS).length;

        emit('block_run.completed', completedEvent({ runId: 'r4' }));

        await waitFor(() =>
            expect(rows()).toEqual([
                'succeeded',
                'succeeded',
                'running',
                'failed',
            ])
        );
        expect(screen.getByText('2 errors')).toBeTruthy();
        expect(api.calls(WORKFLOW_RUNS)).toHaveLength(lists);
        await waitFor(() =>
            expect(api.calls('GET /api/v1/blocks/runs/r4')).toHaveLength(1)
        );
        expect(await screen.findByText(/"done": true/)).toBeTruthy();
    });

    it('completed of an unknown shape: no patch, a first-page request, a warning', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const api = fakeApi({
            ...signedIn,
            [WORKFLOW_RUNS]: server([[run('r5', { status: 'running' })]]),
        });
        const { value, emit } = feed();
        renderPage(() => <RunList workflowId="w1" />);
        followRunEvents(value, sessionClient());
        await waitFor(() => expect(rows()).toEqual(['running']));

        emit('block_run.completed', { run: { runId: 'r5', state: 'failed' } });

        await waitFor(() => expect(firstPages(api, WORKFLOW_RUNS)).toBe(2));
        expect(rows()).toEqual(['running']);
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('block_run.completed'),
            'block_run.completed'
        );
    });

    it('refreshRunLists and patchRunLists touch only the list keys', async () => {
        const api = fakeApi({
            ...signedIn,
            [WORKFLOW_RUNS]: server([[run('r5', { status: 'running' })]]),
        });
        renderPage(() => <RunList workflowId="w1" />);
        await waitFor(() => expect(rows()).toHaveLength(1));
        const client = sessionClient();
        const head = [...runKeys.ofWorkflow('w1'), 'head'];
        const stale: CursorListData<BlockRun> = {
            pages: [{ items: [run('r5', { status: 'running' })], next: null }],
            pageParams: [undefined],
        };
        client.setQueryData(head, stale.pages[0]);
        client.setQueryData(runKeys.detail('r9'), { run: run('r9') });

        await refreshRunLists(client);
        expect(firstPages(api, WORKFLOW_RUNS)).toBe(2);
        expect(client.getQueryState(runKeys.detail('r9'))?.isInvalidated).toBe(
            false
        );

        patchRunLists(client, { ...completed, runId: 'r5' });
        expect(client.getQueryData(head)).toBe(stale.pages[0]);
        await waitFor(() => expect(rows()).toEqual(['failed']));
    });

    it('a run started from the dialog: one first-page request per open list, and its event adds no duplicate', async () => {
        const workflowPages = [[run('r1')]];
        const packagePages = [[run('r1')]];
        const api = fakeApi({
            ...signedIn,
            [WORKFLOW_RUNS]: server(workflowPages),
            [PACKAGE_RUNS]: server(packagePages),
            'POST /api/v1/workflows/w1/runs': () => {
                workflowPages[0] = [run('r2', { status: 'queued' }), run('r1')];
                packagePages[0] = workflowPages[0];
                return json(202, { runId: 'r2', status: 'queued' });
            },
        });
        const { value, emit } = feed();
        renderPage(() => (
            <>
                <div id="workflow">
                    <RunList workflowId="w1" />
                </div>
                <div id="package">
                    <RunList packageId="p1" names={{ w1: 'Guild report' }} />
                </div>
                <RunDialog
                    workflowId="w1"
                    packageId="p1"
                    open
                    onClose={() => {}}
                    onStarted={() => {}}
                />
            </>
        ));
        followRunEvents(value, sessionClient());
        await waitFor(() => expect(rows()).toHaveLength(2));

        fireEvent.click(screen.getByRole('button', { name: 'Run' }));

        await waitFor(() => expect(rows()).toHaveLength(4));
        expect(firstPages(api, WORKFLOW_RUNS)).toBe(2);
        expect(firstPages(api, PACKAGE_RUNS)).toBe(2);

        emit('block_run.started', { runId: 'r2', status: 'queued' });
        await waitFor(() => expect(firstPages(api, WORKFLOW_RUNS)).toBe(3));
        await waitFor(() => expect(firstPages(api, PACKAGE_RUNS)).toBe(3));
        expect(rows()).toEqual(['queued', 'succeeded', 'queued', 'succeeded']);
    });

    const step = (
        runId: string,
        steps: number,
        blockId = 2,
        blockType = 'Http'
    ) => ({
        run: { runId, steps, blockId, blockType },
    });
    const failure = (runId: string, blockId = 2) => ({
        run: { runId, blockId, errorType: 'Timeout', message: 'no answer' },
    });

    it('progress and a failed block: the step under the running row, one more error, the failure in its details; no request', async () => {
        const api = fakeApi({
            ...signedIn,
            [WORKFLOW_RUNS]: server([
                [run('r5', { status: 'queued', steps: null, errorCount: 0 })],
            ]),
            'GET /api/v1/blocks/runs/r5': () =>
                json(200, { run: run('r5', { status: 'running' }) }),
        });
        const { value, emit } = feed();
        renderPage(() => <RunList workflowId="w1" />);
        followRunEvents(value, sessionClient());
        await waitFor(() => expect(rows()).toEqual(['queued']));
        const lists = api.calls(WORKFLOW_RUNS).length;

        emit('block_run.progress', step('r5', 4));
        await waitFor(() => expect(rows()).toEqual(['running']));
        expect(screen.getByText('Step 4: Http #2')).toBeTruthy();
        // Not in the button: its name stays still while the step changes.
        const button = screen.getByRole('button', { name: /running/ });
        expect(button.textContent).not.toContain('Step');

        emit('block_run.block_failed', failure('r5'));
        await waitFor(() => expect(screen.getByText('1 errors')).toBeTruthy());

        fireEvent.click(button);
        expect(
            await screen.findByText(
                'Not done yet: its result shows when it is done.'
            )
        ).toBeTruthy();
        expect(
            screen.getByRole('list', { name: 'Failed blocks so far' })
                .textContent
        ).toBe('#2 Timeout: no answer');
        // No result yet: the details are not asked for.
        expect(api.calls('GET /api/v1/blocks/runs/r5')).toHaveLength(0);
        expect(api.calls(WORKFLOW_RUNS)).toHaveLength(lists);
        await expectNoA11yViolations();
    });

    it('progress keeps the row: the same element, and the focus stays on its button', async () => {
        fakeApi({
            ...signedIn,
            [WORKFLOW_RUNS]: server([[run('r5', { status: 'running' })]]),
        });
        const { value, emit } = feed();
        renderPage(() => <RunList workflowId="w1" />);
        followRunEvents(value, sessionClient());
        const button = await screen.findByRole('button', { name: /running/ });
        button.focus();
        const row = button.closest('li');

        for (const n of [1, 2, 3]) {
            emit('block_run.progress', step('r5', n));
            await waitFor(() =>
                expect(screen.getByText(`Step ${n}: Http #2`)).toBeTruthy()
            );
        }
        emit('block_run.block_failed', failure('r5'));
        await waitFor(() => expect(screen.getByText('1 errors')).toBeTruthy());

        expect(document.querySelector('.workflow-run')).toBe(row);
        expect(document.activeElement).toBe(button);
    });

    it('a block failed before any step: running, no step line, the error counted', async () => {
        fakeApi({
            ...signedIn,
            [WORKFLOW_RUNS]: server([
                [run('r5', { status: 'queued', errorCount: 0 })],
            ]),
        });
        const { value, emit } = feed();
        renderPage(() => <RunList workflowId="w1" />);
        followRunEvents(value, sessionClient());
        await waitFor(() => expect(rows()).toEqual(['queued']));

        emit('block_run.block_failed', failure('r5'));

        await waitFor(() => expect(rows()).toEqual(['running']));
        expect(screen.getByText('1 errors')).toBeTruthy();
        expect(document.querySelector('.workflow-run-live')).toBeNull();
    });

    it('the failures counted so far stay when another run starts and the first page is fetched again', async () => {
        const pages = [[run('r5', { status: 'running', errorCount: 0 })]];
        fakeApi({ ...signedIn, [WORKFLOW_RUNS]: server(pages) });
        const { value, emit } = feed();
        renderPage(() => <RunList workflowId="w1" />);
        followRunEvents(value, sessionClient());
        await waitFor(() => expect(rows()).toEqual(['running']));
        emit('block_run.block_failed', failure('r5', 1));
        emit('block_run.block_failed', failure('r5', 2));
        await waitFor(() => expect(screen.getByText('2 errors')).toBeTruthy());

        // The server's stored count of a running run is still 0.
        pages[0] = [run('r6', { status: 'queued' }), ...pages[0]];
        emit('block_run.started', { runId: 'r6', status: 'queued' });

        await waitFor(() => expect(rows()).toEqual(['queued', 'running']));
        expect(screen.getByText('2 errors')).toBeTruthy();
    });

    it('done: the live entry goes, and a late progress event does not make the run running again', async () => {
        fakeApi({
            ...signedIn,
            [WORKFLOW_RUNS]: server([[run('r5', { status: 'running' })]]),
        });
        const { value, emit } = feed();
        renderPage(() => <RunList workflowId="w1" />);
        const client = sessionClient();
        followRunEvents(value, client);
        await waitFor(() => expect(rows()).toEqual(['running']));
        emit('block_run.progress', step('r5', 9, 1, 'If'));
        await waitFor(() =>
            expect(client.getQueryData(runKeys.live('r5'))).toBeDefined()
        );

        emit('block_run.completed', completedEvent({ runId: 'r5' }));
        await waitFor(() => expect(rows()).toEqual(['failed']));
        expect(client.getQueryData(runKeys.live('r5'))).toBeUndefined();

        emit('block_run.progress', step('r5', 9, 1, 'If'));
        expect(rows()).toEqual(['failed']);
        expect(screen.queryByText('Step 9: If #1')).toBeNull();
    });
});

describe('the live entry of a run', () => {
    afterEach(() => sessionStorage.clear());

    it('keeps the newest 20 failures and counts them all', () => {
        withSession(() => null);
        const client = sessionClient();
        for (let i = 1; i <= 21; i++)
            patchRunBlockFailed(client, {
                runId: 'r',
                blockId: i,
                errorType: 'E',
                message: 'm',
            });
        const live = client.getQueryData<RunLive>(runKeys.live('r'));
        expect(live?.failed).toBe(21);
        expect(live?.failures).toHaveLength(20);
        expect(live?.failures[0]?.blockId).toBe(2);
    });

    it('drops a progress event of another shape; the unsubscribe stops all four', () => {
        withSession(() => null);
        const client = sessionClient();
        const { value, emit, handlers } = feed();
        const stop = followRunEvents(value, client);
        expect(handlers.size).toBe(4);

        emit('block_run.progress', { run: { runId: 'r5', step: 3 } });
        expect(client.getQueryData(runKeys.live('r5'))).toBeUndefined();

        stop();
        expect(handlers.size).toBe(0);
    });
});
