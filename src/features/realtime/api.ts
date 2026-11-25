import { queryOptions } from '@tanstack/solid-query';
import { api, request } from '@shared/api/client';

export const gatewayKeys = {
    all: ['gateway'] as const,
    intents: () => [...gatewayKeys.all, 'intents'] as const,
};

/** The gateway's intents, and whether this token may have each. */
export const gatewayIntentsQuery = () =>
    queryOptions({
        queryKey: gatewayKeys.intents(),
        queryFn: ({ signal }) =>
            request(api.GET('/api/v1/gateway/intents', { signal })),
    });
