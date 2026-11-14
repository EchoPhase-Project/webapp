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

/**
 * What a `block_run.completed` event says, when it has the shape the run
 * lists show; undefined otherwise. Realtime events are not in the API
 * contract: nothing else checks them.
 */
export function runCompletedOf(event: Event): RunCompleted | undefined {
    const { runId, status, durationMs, errorCount } = event;
    if (typeof runId !== 'string' || typeof status !== 'string')
        return undefined;
    if (durationMs !== null && typeof durationMs !== 'number') return undefined;
    if (typeof errorCount !== 'number') return undefined;
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
