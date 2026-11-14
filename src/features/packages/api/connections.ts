import { queryOptions } from '@tanstack/solid-query';
import { api, request } from '@shared/api/client';
import type { ConnectionSummary } from '@shared/api/types';

// Connections: the caller's, to map those a package uses onto when it is
// installed. The webapp has no page of its own for them yet.

export const connectionKeys = {
    all: ['connections'] as const,
    mine: () => [...connectionKeys.all, 'mine'] as const,
};

/** The caller's connections. */
export const myConnectionsQuery = () =>
    queryOptions({
        queryKey: connectionKeys.mine(),
        queryFn: ({ signal }) =>
            request<ConnectionSummary[]>(
                api.GET('/api/v1/connections', { signal })
            ),
    });
