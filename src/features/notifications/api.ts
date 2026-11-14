import {
    mutationOptions,
    queryOptions,
    type QueryClient,
} from '@tanstack/solid-query';
import { api, request } from '@shared/api/client';
import type { AppNotification, NotificationInbox } from '@shared/api/types';

/** How many of the newest notifications the inbox holds. */
export const INBOX_SIZE = 50;

export const notificationKeys = {
    all: ['notifications'] as const,
    inbox: () => [...notificationKeys.all, 'inbox'] as const,
};

/** The newest notifications and the inbox's unread count. */
export const inboxQuery = () =>
    queryOptions({
        queryKey: notificationKeys.inbox(),
        queryFn: ({ signal }) =>
            request<NotificationInbox>(
                api.GET('/api/v1/notifications', {
                    params: { query: { limit: INBOX_SIZE } },
                    signal,
                })
            ),
    });

/**
 * The inbox with a new notification on top (cut to INBOX_SIZE) and one more
 * unread; as it was when it holds that id already.
 */
export function withNotification(
    inbox: NotificationInbox,
    n: AppNotification
): NotificationInbox {
    if (inbox.items.some((i) => i.id === n.id)) return inbox;
    return {
        items: [n, ...inbox.items].slice(0, INBOX_SIZE),
        unread: inbox.unread + (n.read ? 0 : 1),
    };
}

/**
 * One notification read. Shown at once (the bell's dot should not wait for
 * the server); a failure fetches the inbox again, which puts it back.
 */
export const markNotificationReadMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...notificationKeys.all, 'read'] as const,
        mutationFn: (id: string) =>
            request(
                api.POST('/api/v1/notifications/{id}/read', {
                    params: { path: { id } },
                })
            ),
        onMutate: async (id) => {
            // A fetch out now would answer it unread and undo this.
            await queryClient.cancelQueries({
                queryKey: notificationKeys.inbox(),
            });
            queryClient.setQueryData<NotificationInbox>(
                notificationKeys.inbox(),
                (inbox) => {
                    const n = inbox?.items.find((i) => i.id === id);
                    if (!inbox || !n || n.read) return inbox;
                    return {
                        items: inbox.items.map((i) =>
                            i.id === id ? { ...i, read: true } : i
                        ),
                        unread: Math.max(0, inbox.unread - 1),
                    };
                }
            );
        },
        onError: () =>
            queryClient.invalidateQueries({
                queryKey: notificationKeys.inbox(),
            }),
    });

export const markAllNotificationsReadMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...notificationKeys.all, 'read-all'] as const,
        mutationFn: () => request(api.POST('/api/v1/notifications/read')),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
    });

export const deleteNotificationMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...notificationKeys.all, 'delete'] as const,
        mutationFn: (id: string) =>
            request(
                api.DELETE('/api/v1/notifications/{id}', {
                    params: { path: { id } },
                })
            ),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
    });
