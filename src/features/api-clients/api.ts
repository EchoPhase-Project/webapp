import {
    mutationOptions,
    queryOptions,
    type QueryClient,
} from '@tanstack/solid-query';
import { api, request } from '@shared/api/client';

export const apiClientKeys = {
    all: ['api-clients'] as const,
    mine: () => [...apiClientKeys.all, 'mine'] as const,
};

/** The signed-in user's API clients. */
export const apiClientsQuery = () =>
    queryOptions({
        queryKey: apiClientKeys.mine(),
        queryFn: ({ signal }) =>
            request(api.GET('/api/v1/api-clients', { signal })),
    });

/**
 * A new client; the answer holds its secret, shown this once. expiresAt: a
 * moment with Z or an offset (the API takes no local times).
 */
export const createApiClientMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...apiClientKeys.all, 'create'] as const,
        mutationFn: (body: { name: string; expiresAt: string | null }) =>
            request(api.POST('/api/v1/api-clients', { body })),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: apiClientKeys.all }),
    });

export const deleteApiClientMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...apiClientKeys.all, 'delete'] as const,
        mutationFn: (id: string) =>
            request(
                api.DELETE('/api/v1/api-clients/{id}', {
                    params: { path: { id } },
                })
            ),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: apiClientKeys.all }),
    });
