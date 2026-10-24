import { api, send, untyped, type ApiResult } from '@shared/api/client';
import type { ApiClient, CreatedApiClient } from '@shared/api/types';

/** The signed-in user's API clients (the contract leaves the shape out). */
export async function listApiClients(): Promise<ApiClient[]> {
    const result = untyped<ApiClient[]>(
        await send(api.GET('/api/v1/api-clients'))
    );
    return result.ok ? result.data : [];
}

/** expiresAt: a moment with Z or an offset (the API takes no local times). */
export async function createApiClient(body: {
    name: string;
    expiresAt: string | null;
}): Promise<ApiResult<CreatedApiClient>> {
    return untyped<CreatedApiClient>(
        await send(api.POST('/api/v1/api-clients', { body }))
    );
}

export function deleteApiClient(id: string): Promise<ApiResult<unknown>> {
    return send(
        api.DELETE('/api/v1/api-clients/{id}', { params: { path: { id } } })
    );
}
