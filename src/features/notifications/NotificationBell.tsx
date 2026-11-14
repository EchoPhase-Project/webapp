import { createEffect, createSignal, For, on, onCleanup, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { IconBell } from '@shared/ui/icons';
import { useAuth } from '@shared/api/auth';
import type { AppNotification } from '@shared/api/types';
import { useDateFormat } from '@shared/lib/date-format';
import { createDismiss } from '@shared/lib/dismiss';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import HeaderButton from '@shared/ui/HeaderButton';
import RemoveButton from '@shared/ui/RemoveButton';
import { deleteNotification, fetchInbox, markAllRead, markRead } from './api';
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

const MAX = 50;

/**
 * The top bar's bell: the inbox (fetched on sign-in and on every
 * reconnect, so nothing missed while away is lost) and new notifications
 * live, with the unread count on the bell.
 */
export default function NotificationBell(props: { feed: NotificationFeed }) {
    const t = useLocalizer('notifications');
    const { isAuthenticated } = useAuth();
    const date = useDateFormat();
    const navigate = useNavigate();
    const [items, setItems] = createSignal<AppNotification[]>([]);
    const [unread, setUnread] = createSignal(0);
    const [open, setOpen] = createSignal(false);
    const [announcement, setAnnouncement] = createSignal('');
    let root: HTMLDivElement | undefined;

    async function load() {
        const inbox = await fetchInbox();
        if (!inbox) return;
        setItems(inbox.items);
        setUnread(inbox.unread);
    }

    createEffect(
        on(
            () => [isAuthenticated(), props.feed.status()] as const,
            ([signedIn, status]) => {
                if (!signedIn) {
                    setItems([]);
                    setUnread(0);
                } else if (status === 'open' || status === 'idle') void load();
            }
        )
    );

    const onCreated = (event: { [key: string]: unknown }) => {
        const n = event.notification as AppNotification | undefined;
        if (!n || items().some((i) => i.id === n.id)) return;
        setItems((list) => [n, ...list].slice(0, MAX));
        setUnread((c) => c + 1);
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
        if (!n.read) {
            setItems((list) =>
                list.map((i) => (i.id === n.id ? { ...i, read: true } : i))
            );
            setUnread((c) => Math.max(0, c - 1));
            void markRead(n.id);
        }
        if (n.link) {
            setOpen(false);
            navigate(n.link);
        }
    }

    async function readAll() {
        setItems((list) => list.map((i) => ({ ...i, read: true })));
        setUnread(0);
        await markAllRead();
    }

    async function remove(n: AppNotification) {
        setItems((list) => list.filter((i) => i.id !== n.id));
        if (!n.read) setUnread((c) => Math.max(0, c - 1));
        await deleteNotification(n.id);
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
                                    onClick={() => void readAll()}
                                >
                                    {t('read_all', 'Mark all read')}
                                </Button>
                            </Show>
                        </div>
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
                                                    onClick={() =>
                                                        void remove(n)
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
