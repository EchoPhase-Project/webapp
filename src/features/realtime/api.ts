import { queryOptions } from '@tanstack/solid-query';
import { api, request } from '@shared/api/client';
import type { GatewayIntent } from '@shared/api/types';

export const gatewayKeys = {
    all: ['gateway'] as const,
    intents: () => [...gatewayKeys.all, 'intents'] as const,
};

/** The gateway's intents, and whether this token may have each. */
export const gatewayIntentsQuery = () =>
    queryOptions({
        queryKey: gatewayKeys.intents(),
        // The contract leaves the answer undescribed: its shape is named here.
        queryFn: ({ signal }) =>
            request<GatewayIntent[]>(
                api.GET('/api/v1/gateway/intents', { signal })
            ),
    });
