import type { QueryClient } from '@tanstack/solid-query';
import { noteKeys } from './api';

type Event = { [key: string]: unknown };

/** Where note events come from: the realtime gateway (or a test's stand-in). */
export interface NoteEventFeed {
    subscribe: (type: string, handler: (event: Event) => void) => () => void;
}

/**
 * The kind of notification a `notification.created` event carries, when it
 * says one; undefined otherwise. Realtime events are not in the API
 * contract: nothing else checks them.
 */
export function notificationKindOf(event: Event): string | undefined {
    const n = event.notification;
    if (typeof n !== 'object' || n === null) return undefined;
    const kind = (n as { kind?: unknown }).kind;
    return typeof kind === 'string' ? kind : undefined;
}

/**
 * Keeps the notes in the cache current with the gateway: a note shared with
 * the user shows up in an open list (asked again: the event does not carry
 * the note). An event of an unknown shape asks again too, which is harmless.
 * Returns the unsubscribe.
 */
export function followNoteEvents(
    feed: NoteEventFeed,
    queryClient: QueryClient
) {
    return feed.subscribe('notification.created', (event) => {
        const kind = notificationKindOf(event);
        if (kind === undefined || kind === 'note_shared')
            void queryClient.invalidateQueries({ queryKey: noteKeys.all });
    });
}
