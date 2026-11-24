import {
    infiniteQueryOptions,
    mutationOptions,
    queryOptions,
    type Query,
    type QueryClient,
} from '@tanstack/solid-query';
import { api, request } from '@shared/api/client';
import type {
    BlockRun,
    BlockRunDetails,
    BlockRunPage,
    RunStarted,
} from '@shared/api/types';
import {
    cursorPages,
    patchItem,
    refreshHead,
    type CursorListOptions,
    type Page,
} from '@shared/api/paged-list';

// Runs: of one workflow, or of all a package's workflows, newest first; and
// one run's result.

export const runKeys = {
    all: ['runs'] as const,
    ofWorkflow: (id: string) => [...runKeys.all, 'workflow', id] as const,
    ofPackage: (id: string) => [...runKeys.all, 'package', id] as const,
    detail: (runId: string) => [...runKeys.all, 'detail', runId] as const,
};

/** A run list item's id. */
export const runId = (run: BlockRun) => run.runId;

const RUNS_PAGE = 20;

const pageOf = (page: BlockRunPage): Page<BlockRun> => ({
    items: page.data,
    next: page.nextCursor ?? null,
});

export const runsOfWorkflowInfiniteQuery = (id: string) =>
    infiniteQueryOptions({
        queryKey: runKeys.ofWorkflow(id),
        queryFn: async ({ pageParam, signal }) =>
            pageOf(
                await request<BlockRunPage>(
                    api.GET('/api/v1/workflows/{id}/runs', {
                        params: {
                            path: { id },
                            query: { limit: RUNS_PAGE, cursor: pageParam },
                        },
                        signal,
                    })
                )
            ),
        ...cursorPages,
    });

/** The runs of all its workflows. */
export const runsOfPackageInfiniteQuery = (id: string) =>
    infiniteQueryOptions({
        queryKey: runKeys.ofPackage(id),
        queryFn: async ({ pageParam, signal }) =>
            pageOf(
                await request<BlockRunPage>(
                    api.GET('/api/v1/workflow-packages/{id}/runs', {
                        params: {
                            path: { id },
                            query: { limit: RUNS_PAGE, cursor: pageParam },
                        },
                        signal,
                    })
                )
            ),
        ...cursorPages,
    });

/** One run with its result (output, variables, errors) while kept. */
export const runQuery = (runId: string) =>
    queryOptions({
        queryKey: runKeys.detail(runId),
        queryFn: ({ signal }) =>
            request<BlockRunDetails>(
                api.GET('/api/v1/blocks/runs/{runId}', {
                    params: { path: { runId } },
                    signal,
                })
            ),
    });

/**
 * A run now, active or not, with this input (a JSON value). The new run
 * shows on top of the workflow's and the package's run lists (one request
 * of each first page), also when no event comes.
 */
export const runWorkflowMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...runKeys.all, 'start'] as const,
        mutationFn: (v: { id: string; packageId: string; input?: unknown }) =>
            request<RunStarted>(
                api.POST('/api/v1/workflows/{id}/runs', {
                    params: { path: { id: v.id } },
                    body: { input: v.input },
                })
            ),
        onSuccess: (_, v) => {
            void refreshHead(
                queryClient,
                runsOfWorkflowInfiniteQuery(v.id),
                runId
            );
            void refreshHead(
                queryClient,
                runsOfPackageInfiniteQuery(v.packageId),
                runId
            );
        },
    });

/**
 * The description of the run list a query is for; undefined for the other
 * run queries (a run's details, a list's head).
 */
function runListOf(query: Query): CursorListOptions<BlockRun> | undefined {
    const [, kind, id, ...rest] = query.queryKey;
    if (typeof id !== 'string' || rest.length > 0) return undefined;
    if (kind === 'workflow') return runsOfWorkflowInfiniteQuery(id);
    if (kind === 'package') return runsOfPackageInfiniteQuery(id);
    return undefined;
}

const isRunList = (query: Query) => runListOf(query) !== undefined;

/**
 * A run started: the first page of each open run list fetched again and
 * merged in (one request each); closed ones only marked stale, so they are
 * fetched when opened.
 */
export async function refreshRunLists(queryClient: QueryClient) {
    void queryClient.invalidateQueries({
        queryKey: runKeys.all,
        type: 'inactive',
        predicate: isRunList,
        refetchType: 'none',
    });
    const open = queryClient.getQueryCache().findAll({
        queryKey: runKeys.all,
        type: 'active',
        predicate: isRunList,
    });
    await Promise.all(
        open.flatMap((query) => {
            const list = runListOf(query);
            return list ? [refreshHead(queryClient, list, runId)] : [];
        })
    );
}

/** What a `block_run.completed` event says about a run. */
export interface RunCompleted {
    runId: string;
    status: string;
    durationMs: number | null;
    errorCount: number | null;
}

/**
 * A run done: its row patched from the event in every run list held, open
 * or closed, on any loaded page (no request). Its details, when open, are
 * fetched again: they hold steps and errors the event does not.
 */
export function patchRunLists(queryClient: QueryClient, done: RunCompleted) {
    const lists = queryClient
        .getQueryCache()
        .findAll({ queryKey: runKeys.all, predicate: isRunList });
    for (const query of lists)
        patchItem<BlockRun>(
            queryClient,
            query.queryKey,
            done.runId,
            {
                status: done.status,
                durationMs: done.durationMs,
                errorCount: done.errorCount,
            },
            runId
        );
    void queryClient.invalidateQueries({
        queryKey: runKeys.detail(done.runId),
        exact: true,
    });
}
