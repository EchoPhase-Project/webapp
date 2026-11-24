import type { QueryClient } from '@tanstack/solid-query';
import {
    patchRunLists,
    refreshRunLists,
    type RunCompleted,
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
 * Keeps the run lists in the cache current with the gateway's run events:
 * a new run merged in on top of the open lists (one request each), a run
 * done patched from its event (none). Returns the unsubscribe.
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
    return () => {
        started();
        completed();
    };
}
