import type { QueryClient } from '@tanstack/solid-query';
import {
    patchRunBlockFailed,
    patchRunLists,
    patchRunProgress,
    refreshRunLists,
    type RunBlockFailed,
    type RunCompleted,
    type RunProgress,
} from '@features/packages/api/runs';

type Event = { [key: string]: unknown };

/** Where run events come from: the realtime gateway (or a test's stand-in). */
export interface RunEventFeed {
    subscribe: (type: string, handler: (event: Event) => void) => () => void;
}

const isRecord = (value: unknown): value is Event =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isCount = (value: unknown): value is number | null =>
    value === null || typeof value === 'number';

/**
 * What a `block_run.completed` event says, when it has the shape the run
 * lists show; undefined otherwise. The server sends the run under `run`
 * (BlockRunEventsNotifier: `{ type, run: { runId, status, durationMs,
 * errorCount } }`); the two counts may be null, as in the API's run.
 * Realtime events are not in the API contract: nothing else checks them.
 */
export function runCompletedOf(event: Event): RunCompleted | undefined {
    const run = event.run;
    if (!isRecord(run)) return undefined;
    const { runId, status, durationMs, errorCount } = run;
    if (typeof runId !== 'string' || typeof status !== 'string')
        return undefined;
    if (!isCount(durationMs) || !isCount(errorCount)) return undefined;
    return { runId, status, durationMs, errorCount };
}

/**
 * What a `block_run.progress` event says (`{ type, run: { runId, steps,
 * blockId, blockType } }`, BlockRunProgressObserver: at most every 250 ms);
 * undefined for another shape.
 */
export function runProgressOf(event: Event): RunProgress | undefined {
    const run = event.run;
    if (!isRecord(run)) return undefined;
    const { runId, steps, blockId, blockType } = run;
    if (typeof runId !== 'string' || typeof blockType !== 'string')
        return undefined;
    if (typeof steps !== 'number' || typeof blockId !== 'number')
        return undefined;
    return { runId, steps, blockId, blockType };
}

/**
 * What a `block_run.block_failed` event says (`{ type, run: { runId,
 * blockId, errorType, message } }`); undefined for another shape.
 */
export function runBlockFailedOf(event: Event): RunBlockFailed | undefined {
    const run = event.run;
    if (!isRecord(run)) return undefined;
    const { runId, blockId, errorType, message } = run;
    if (typeof runId !== 'string' || typeof blockId !== 'number')
        return undefined;
    if (typeof errorType !== 'string' || typeof message !== 'string')
        return undefined;
    return { runId, blockId, errorType, message };
}

/**
 * Keeps the run lists in the cache current with the gateway's run events:
 * a new run merged in on top of the open lists (one request each), a step
 * or a failed block of a running run and a run done patched from their
 * events (none). Returns the unsubscribe.
 */
export function followRunEvents(feed: RunEventFeed, queryClient: QueryClient) {
    const started = feed.subscribe(
        'block_run.started',
        () => void refreshRunLists(queryClient)
    );
    const completed = feed.subscribe('block_run.completed', (event) => {
        const done = runCompletedOf(event);
        if (done) patchRunLists(queryClient, done);
        else {
            // Unknown shape: fetched, not patched blindly.
            console.warn(
                'followRunEvents: an unexpected block_run.completed event; fetching the run lists.',
                event.type
            );
            void refreshRunLists(queryClient);
        }
    });
    // Progress is only a preview: an event of another shape is dropped (the
    // completed event and the API correct the run), not fetched for.
    const progress = feed.subscribe('block_run.progress', (event) => {
        const p = runProgressOf(event);
        if (p) patchRunProgress(queryClient, p);
    });
    const failed = feed.subscribe('block_run.block_failed', (event) => {
        const f = runBlockFailedOf(event);
        if (f) patchRunBlockFailed(queryClient, f);
    });
    return () => {
        started();
        completed();
        progress();
        failed();
    };
}
