import type { AppNotification } from '@shared/api/types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The notification a `notification.created` event carries, when it has the
 * shape the bell shows; undefined otherwise. Realtime events are not in the
 * API contract: nothing else checks them.
 */
export function notificationOf(event: {
    [key: string]: unknown;
}): AppNotification | undefined {
    const n = event.notification;
    if (!isRecord(n)) return undefined;
    const strings = ['id', 'kind', 'title', 'body', 'createdAt'] as const;
    if (!strings.every((key) => typeof n[key] === 'string')) return undefined;
    if (typeof n.read !== 'boolean') return undefined;
    if (n.link != null && typeof n.link !== 'string') return undefined;
    const params = n.params;
    if (
        !isRecord(params) ||
        !Object.values(params).every((v) => typeof v === 'string')
    )
        return undefined;
    return n as AppNotification;
}
