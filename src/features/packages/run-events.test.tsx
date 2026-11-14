// @vitest-environment jsdom
import { createSignal, Show } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { sessionClient } from '@shared/api/session-provider';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import type { CursorListData } from '@shared/lib/paged-list';
import type { BlockRun } from '@shared/api/types';
import {
    patchRunLists,
    refreshRunLists,
    runKeys,
} from '@features/packages/api/runs';
import RunDialog from './components/RunDialog';
import RunList from './components/RunList';
import {
    followRunEvents,
    runCompletedOf,
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

describe('runCompletedOf', () => {
    it('reads a whole event', () => {
        expect(runCompletedOf({ type: 'x', ...completed })).toEqual(completed);
        expect(
            runCompletedOf({ ...completed, durationMs: null })?.durationMs
        ).toBeNull();
    });

    it('answers undefined for a field missing, of another type or renamed', () => {
        const { errorCount: _, ...missing } = completed;
        expect(runCompletedOf(missing)).toBeUndefined();
        expect(
            runCompletedOf({ ...completed, durationMs: '4000' })
        ).toBeUndefined();
        expect(runCompletedOf({ ...completed, runId: 5 })).toBeUndefined();
        const { status, ...rest } = completed;
        expect(runCompletedOf({ ...rest, state: status })).toBeUndefined();
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

    it('completed: patched from the event on the third loaded page, no request; the open details fetched again', async () => {
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
        // r4 open: its details asked once.
        fireEvent.click(screen.getAllByRole('button', { name: /running/ })[1]);
        await waitFor(() =>
            expect(api.calls('GET /api/v1/blocks/runs/r4')).toHaveLength(1)
        );
        const lists = api.calls(WORKFLOW_RUNS).length;

        emit('block_run.completed', { ...completed, runId: 'r4' });

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
            expect(api.calls('GET /api/v1/blocks/runs/r4')).toHaveLength(2)
        );
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

        emit('block_run.completed', { runId: 'r5', state: 'failed' });

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
});
