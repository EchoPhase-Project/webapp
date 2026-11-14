import {
    mutationOptions,
    queryOptions,
    type QueryClient,
} from '@tanstack/solid-query';
import { api, request } from '@shared/api/client';
import { endSession } from '@shared/api/session-provider';

export const sessionKeys = {
    all: ['sessions'] as const,
    mine: () => [...sessionKeys.all, 'mine'] as const,
};

/** The signed-in user's sessions (the first page; it holds plenty). */
export const sessionsQuery = () =>
    queryOptions({
        queryKey: sessionKeys.mine(),
        queryFn: async ({ signal }) =>
            (await request(api.GET('/api/v1/sessions', { signal }))).data,
    });

/**
 * One session. Revoking this device's own ends it: the list asked again
 * answers 401, which ends the session here too.
 */
export const revokeSessionMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...sessionKeys.all, 'revoke'] as const,
        mutationFn: (id: string) =>
            request(
                api.DELETE('/api/v1/sessions/{id}', {
                    params: { path: { id } },
                })
            ),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
    });

/**
 * Every session of the user, this one included: signed out here at once,
 * with nothing to ask again.
 */
export const revokeAllSessionsMutation = () =>
    mutationOptions({
        mutationKey: [...sessionKeys.all, 'revoke-all'] as const,
        mutationFn: () => request(api.DELETE('/api/v1/sessions')),
        onSuccess: () => endSession(),
    });
