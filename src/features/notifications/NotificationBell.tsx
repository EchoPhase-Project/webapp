import { createEffect, createSignal, For, on, onCleanup, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useQuery, useQueryClient } from '@tanstack/solid-query';
import { IconBell } from '@shared/ui/icons';
import { useAuth } from '@shared/api/auth';
import { createSubmit } from '@shared/api/submit';
import type { AppNotification, NotificationInbox } from '@shared/api/types';
import { useDateFormat } from '@shared/lib/date-format';
import { createDismiss } from '@shared/lib/dismiss';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import HeaderButton from '@shared/ui/HeaderButton';
import RemoveButton from '@shared/ui/RemoveButton';
import {
    deleteNotificationMutation,
    inboxQuery,
    markAllNotificationsReadMutation,
    markNotificationReadMutation,
    notificationKeys,
    withNotification,
} from './api';
import { notificationOf } from './events';
import { wordingOf } from './wording';
import './notifications.scss';

/** What the bell needs of the realtime gateway (the app passes it). */
export interface NotificationFeed {
    subscribe: (
        type: string,
        handler: (event: { [key: string]: unknown }) => void
    ) => () => void;
    /** "open" once connected: then the inbox is fetched again, for what came meanwhile. */
    status: () => string;
}

/**
 * The top bar's bell: the inbox (fetched on sign-in and again each time the
 * feed opens, so nothing missed while away is lost) and new notifications
 * merged in live, with the unread count on the bell.
 */
export default function NotificationBell(props: { feed: NotificationFeed }) {
    const t = useLocalizer('notifications');
    const { isAuthenticated } = useAuth();
    const date = useDateFormat();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    // Outside the guards: asked only while someone is signed in.
    const inbox = useQuery(() => ({
        ...inboxQuery(),
        enabled: isAuthenticated(),
    }));
    const items = () => inbox.data?.items ?? [];
    const unread = () => inbox.data?.unread ?? 0;
    // The actions' failures show in the panel.
    const acting = createSubmit();
    const markRead = acting.mutation(markNotificationReadMutation);
    const markAllRead = acting.mutation(markAllNotificationsReadMutation);
    const deleteOne = acting.mutation(deleteNotificationMutation);
    const [open, setOpen] = createSignal(false);
    const [announcement, setAnnouncement] = createSignal('');
    let root: HTMLDivElement | undefined;

    // The feed opened again after a drop: events may have been lost while
    // it was down, so the inbox is checked with the server.
    createEffect(
        on(
            () => props.feed.status(),
            (status, before) => {
                if (status === 'open' && before !== 'open')
                    void queryClient.invalidateQueries({
                        queryKey: notificationKeys.inbox(),
                    });
            },
            { defer: true }
        )
    );

    // The event holds the whole notification: merged into the inbox with no
    // request. Before the first load there is nothing to merge into (that
    // load has it); an event of an unknown shape fetches the inbox instead.
    const onCreated = (event: { [key: string]: unknown }) => {
        const n = notificationOf(event);
        if (!n) {
            console.warn(
                'NotificationBell: an unexpected notification.created event; fetching the inbox.',
                event.type
            );
            void queryClient.invalidateQueries({
                queryKey: notificationKeys.inbox(),
            });
            return;
        }
        const key = notificationKeys.inbox();
        const before = queryClient.getQueryData<NotificationInbox>(key);
        if (!before || before.items.some((i) => i.id === n.id)) return;
        queryClient.setQueryData(key, withNotification(before, n));
        setAnnouncement(wordingOf(n, t).title);
    };
    // The feed is the app's one gateway: subscribed once, for the bell's life.
    // eslint-disable-next-line solid/reactivity
    onCleanup(props.feed.subscribe('notification.created', onCreated));

    // Closes on a click elsewhere and on Escape.
    createDismiss(
        () => root,
        open,
        () => setOpen(false)
    );

    function openItem(n: AppNotification) {
        if (!n.read) void markRead.run(n.id);
        if (n.link) {
            setOpen(false);
            navigate(n.link);
        }
    }

    const label = () =>
        unread() > 0
            ? t('bell_unread', 'Notifications ({count} unread)', {
                  count: unread(),
              })
            : t('bell', 'Notifications');

    return (
        <Show when={isAuthenticated()}>
            <div class="notifications" ref={root}>
                <HeaderButton
                    label={label()}
                    aria-expanded={open()}
                    aria-haspopup="true"
                    onClick={() => setOpen((v) => !v)}
                >
                    <IconBell />
                    <Show when={unread() > 0}>
                        <span class="header-dot" aria-hidden="true" />
                    </Show>
                </HeaderButton>

                <span class="visually-hidden" aria-live="polite">
                    {announcement()}
                </span>

                <Show when={open()}>
                    <div
                        class="notifications-panel card"
                        role="region"
                        aria-label={t('bell', 'Notifications')}
                    >
                        <div class="notifications-head">
                            <h2>
                                {t('bell', 'Notifications')}
                                <Show when={unread() > 0}>
                                    <span class="notifications-count">
                                        {t('unread_count', '{count} new', {
                                            count: unread(),
                                        })}
                                    </span>
                                </Show>
                            </h2>
                            <Show when={unread() > 0}>
                                <Button
                                    variant="ghost"
                                    busy={acting.busy()}
                                    onClick={() => void markAllRead.run()}
                                >
                                    {t('read_all', 'Mark all read')}
                                </Button>
                            </Show>
                        </div>
                        <ErrorSummary errors={acting.errors()} />
                        <Show
                            when={items().length > 0}
                            fallback={
                                <p class="muted notifications-empty">
                                    {t('empty', 'Nothing new.')}
                                </p>
                            }
                        >
                            <ul class="notifications-list">
                                <For each={items()}>
                                    {(n) => {
                                        const words = () => wordingOf(n, t);
                                        return (
                                            <li classList={{ unread: !n.read }}>
                                                {/* eslint-disable-next-line no-restricted-syntax -- an item of the list that opens what it is about, not an action button */}
                                                <button
                                                    type="button"
                                                    class="notification-item"
                                                    onClick={() =>
                                                        void openItem(n)
                                                    }
                                                >
                                                    <span class="notification-title">
                                                        {words().title}
                                                    </span>
                                                    <Show when={words().body}>
                                                        <span class="notification-body">
                                                            {words().body}
                                                        </span>
                                                    </Show>
                                                    <span class="notification-time muted">
                                                        {date(n.createdAt)}
                                                    </span>
                                                </button>
                                                <RemoveButton
                                                    label={t(
                                                        'delete',
                                                        'Delete notification'
                                                    )}
                                                    disabled={acting.busy()}
                                                    onClick={() =>
                                                        void deleteOne.run(n.id)
                                                    }
                                                />
                                            </li>
                                        );
                                    }}
                                </For>
                            </ul>
                        </Show>
                    </div>
                </Show>
            </div>
        </Show>
    );
}
