import { api, send, type ApiResult } from '@shared/api/client';
import type { NotificationInbox } from '@shared/api/types';

/** The newest notifications and the inbox's unread count; null when it failed. */
export async function fetchInbox(): Promise<NotificationInbox | null> {
    const result = await send(
        api.GET('/api/v1/notifications', { params: { query: { limit: 50 } } })
    );
    return result.ok ? result.data : null;
}

export function markRead(id: string): Promise<ApiResult<unknown>> {
    return send(
        api.POST('/api/v1/notifications/{id}/read', {
            params: { path: { id } },
        })
    );
}

export function markAllRead(): Promise<ApiResult<unknown>> {
    return send(api.POST('/api/v1/notifications/read'));
}

export function deleteNotification(id: string): Promise<ApiResult<unknown>> {
    return send(
        api.DELETE('/api/v1/notifications/{id}', { params: { path: { id } } })
    );
}
