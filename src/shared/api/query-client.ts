import { QueryClient, type DefaultOptions } from '@tanstack/solid-query';
import { ApiError } from './client';

/**
 * A QueryClient with the app's rules. Each session gets its own
 * (session-provider.tsx); there is no global one. `overrides` are for
 * tests (no retries, no garbage collection timers).
 */
export function createAppQueryClient(overrides: DefaultOptions = {}) {
    return new QueryClient({
        defaultOptions: {
            ...overrides,
            queries: {
                // Lists change by the user's own actions (invalidated) and by
                // realtime events; what changes rarely sets its own staleTime
                // in its description.
                staleTime: 30_000,
                // 4xx is an answer, not a hiccup: only no answer at all
                // (status 0) and 5xx are retried, twice at most.
                retry: (failures, error) =>
                    failures < 2 &&
                    !(
                        error instanceof ApiError &&
                        error.status > 0 &&
                        error.status < 500
                    ),
                ...overrides.queries,
            },
            mutations: { retry: false, ...overrides.mutations },
        },
    });
}
