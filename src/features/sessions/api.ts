import { api, send, type ApiResult } from '@shared/api/client';
import type { Session } from '@shared/api/types';

/** The signed-in user's sessions (the first page; it holds plenty). */
export async function listSessions(): Promise<Session[]> {
    const result = await send(api.GET('/api/v1/sessions'));
    return result.ok ? result.data.data : [];
}

export function revokeSession(id: string): Promise<ApiResult<unknown>> {
    return send(
        api.DELETE('/api/v1/sessions/{id}', { params: { path: { id } } })
    );
}

/** Every session of the user, this one included. */
export function revokeAllSessions(): Promise<ApiResult<unknown>> {
    return send(api.DELETE('/api/v1/sessions'));
}
