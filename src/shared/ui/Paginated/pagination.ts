import {
    createEffect,
    createMemo,
    createSignal,
    on,
    onCleanup,
} from 'solid-js';
import type { PagedList } from '@shared/api/paged-list';
import { useI18n } from '@shared/i18n/i18n-context';

/**
 * `more`: the items of all loaded pages, "Show more" at the end. `pages`:
 * one page on the screen, "Previous" and "Next".
 */
export type PageMode = 'more' | 'pages';

/** The mark of an item of a paged list: the focus goes to it. */
export const ITEM_ATTRIBUTE = 'data-paginated-item';

/** Spread on each item's element (a `Row`'s props, an `<li>`). */
export const paginatedItem = { [ITEM_ATTRIBUTE]: '' } as const;

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea';

/**
 * Moves the focus to the item: to its first control (the name's link, the
 * row's button), or to the item itself when it has none.
 */
function focusItem(item: HTMLElement) {
    const target = item.matches(FOCUSABLE)
        ? item
        : (item.querySelector<HTMLElement>(FOCUSABLE) ?? item);
    if (target === item && !item.hasAttribute('tabindex'))
        item.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
}

/**
 * A list that comes one page at a time (createPagedList), shown in a mode,
 * without markup of its own: `Paginated` draws it. Both modes work from
 * the pages in the cache (the server has cursors, no page numbers and no
 * total). In `pages`, "Previous" shows a loaded page at once, without a
 * request, and "Next" asks only for a page that is not loaded yet. A new
 * search or filter (another key of the list) starts on the first page.
 *
 * The list's element gets `root`; its items carry `paginatedItem`. After
 * "Show more", the focus goes to the first new item; after a change of
 * page, the list scrolls to its top and the focus goes to its first item.
 * `status` is the text of one live region: "Loaded 30 more", "Page 3".
 */
export function createPagination<T>(
    list: PagedList<T>,
    options: { mode?: PageMode | (() => PageMode | undefined) } = {}
) {
    const { t } = useI18n();
    const mode = (): PageMode =>
        (typeof options.mode === 'function' ? options.mode() : options.mode) ??
        'more';
    // The page asked for (from 0); the one shown is the nearest loaded one.
    const [wanted, setWanted] = createSignal(0);
    const [status, setStatus] = createSignal('');
    let root: HTMLElement | undefined;
    // After "Show more": how many items there were, and whether the focus
    // goes to the first new one (not for a load as the end comes in view).
    let more: { from: number; focus: boolean } | null = null;
    // A change of page asked for by the user: scroll and focus once it shows.
    let moved = false;

    const last = () => list.pages().length - 1;
    // A memo: the effect below runs only when the page shown changes.
    const shown = createMemo(() => Math.max(0, Math.min(wanted(), last())));
    const items = (): T[] =>
        mode() === 'pages' ? (list.pages()[shown()] ?? []) : list.items();

    createEffect(
        on(
            list.key,
            () => {
                setWanted(0);
                setStatus('');
                more = null;
                moved = false;
            },
            { defer: true }
        )
    );

    // The items of "Show more" came: say how many, focus the first.
    createEffect(
        on(
            () => list.items().length,
            (count) => {
                if (!more || count <= more.from) return;
                const { from, focus } = more;
                more = null;
                const loaded = t('ui.loaded_more', 'Loaded {count} more', {
                    count: count - from,
                });
                setStatus(
                    list.more()
                        ? loaded
                        : `${loaded}. ${t('ui.no_more', 'No more.')}`
                );
                const item = root?.querySelectorAll<HTMLElement>(
                    `[${ITEM_ATTRIBUTE}]`
                )[from];
                if (focus && item) focusItem(item);
            }
        )
    );

    // Another page shows: say which, go to its top, focus its first item.
    createEffect(
        on(
            shown,
            (page) => {
                if (!moved || mode() !== 'pages') return;
                moved = false;
                setStatus(t('ui.page', 'Page {page}', { page: page + 1 }));
                root?.scrollIntoView?.({ block: 'start' });
                const item = root?.querySelector<HTMLElement>(
                    `[${ITEM_ATTRIBUTE}]`
                );
                if (item) focusItem(item);
            },
            { defer: true }
        )
    );

    /** The next page, added to the items (mode `more`). */
    function loadMore(focus = true) {
        if (!list.more() || list.fetchingMore()) return;
        more = { from: list.items().length, focus };
        list.loadMore();
    }

    /** The page after the one shown: from the cache, or asked for. */
    function next() {
        if (wanted() > shown()) {
            // Asked for already: again, if it failed.
            list.loadMore();
            return;
        }
        const target = shown() + 1;
        if (target > last() && !list.more()) return;
        moved = true;
        setWanted(target);
        if (target > last()) list.loadMore();
    }

    /** The page before the one shown: always in the cache, no request. */
    function prev() {
        if (shown() === 0) return;
        moved = true;
        setWanted(shown() - 1);
    }

    /** A ref: the next page comes as this element scrolls into view. */
    function watchEnd(el: HTMLElement) {
        if (typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) loadMore(false);
            },
            { rootMargin: '400px' }
        );
        observer.observe(el);
        onCleanup(() => observer.disconnect());
    }

    return {
        mode,
        /** The items to show: all loaded (more), or the page's (pages). */
        items,
        /** The page shown, from 1. */
        page: () => shown() + 1,
        hasPrev: () => shown() > 0,
        hasNext: () => shown() < last() || list.more(),
        /** While a next page is on its way. */
        busy: () => list.fetchingMore(),
        loadMore,
        next,
        prev,
        watchEnd,
        /** The text of the live region. */
        status,
        /** A ref for the list's element: where the focus and scroll go. */
        root: (el: HTMLElement) => {
            root = el;
        },
    };
}
