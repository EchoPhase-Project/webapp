import { createMemo, onCleanup } from 'solid-js';
import {
    useInfiniteQuery,
    type GetNextPageParamFunction,
    type InfiniteData,
    type QueryClient,
    type QueryFunctionContext,
    type QueryKey,
    type SkipToken,
} from '@tanstack/solid-query';

/** A page of a list, and where the next one starts (null: no more). */
export type Page<T> = { items: T[]; next: string | null };

/** The page params every cursor list shares: no cursor first, then the page's `next`. */
export const cursorPages = {
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: Page<unknown>) => last.next ?? undefined,
};

/**
 * What a cursor list is described with in its feature's api.ts: an
 * infiniteQueryOptions of `Page<T>` pages, with `cursorPages` spread in.
 */
export interface CursorListOptions<T> {
    queryKey: QueryKey;
    // A method's parameters are bivariant: a description's queryFn takes the
    // context of its own key, which is narrower than QueryKey.
    queryFn?:
        | {
              call(
                  context: QueryFunctionContext<QueryKey, string | undefined>
              ): Page<T> | Promise<Page<T>>;
          }['call']
        | SkipToken;
    initialPageParam: string | undefined;
    getNextPageParam: GetNextPageParamFunction<string | undefined, Page<T>>;
}

/** A list's pages in the cache. */
export type CursorListData<T> = InfiniteData<Page<T>, string | undefined>;

/**
 * A list fetched a page at a time, by cursor, the pages added up: a
 * useInfiniteQuery of the description from the feature's api.ts. Another
 * search is another key: the list starts over, and the request for the old
 * one is cancelled. A page shows it with `Paginated` (or
 * `createPagination`), which adds "Show more" or the pages, the states and
 * the focus.
 */
export function createPagedList<T>(describe: () => CursorListOptions<T>) {
    const query = useInfiniteQuery(describe);

    // Which list this is: another search or filter is another key.
    const key = createMemo(() => JSON.stringify(describe().queryKey));
    const pages = () => query.data?.pages.map((p) => p.items) ?? [];
    const items = () => query.data?.pages.flatMap((p) => p.items) ?? [];
    const more = () => query.hasNextPage;
    // Not isFetching: that is also true for a background refetch (an event,
    // the window back in focus), and the list would flash its spinner.
    const loading = () => query.isPending || query.isFetchingNextPage;
    // The first page has come (it stays while a later page fails).
    const loaded = () => query.data !== undefined;
    const error = () => query.error;

    /**
     * The next page, unless there is none or one is on its way. Not over a
     * fetch on its way either (cancelRefetch: false): the state read here
     * can lag behind a click just made.
     */
    function loadMore() {
        if (query.hasNextPage && !query.isFetchingNextPage)
            void query.fetchNextPage({ cancelRefetch: false });
    }

    /** Asks again for what failed: the next page, or the list. */
    function retry() {
        if (query.isFetchNextPageError) void query.fetchNextPage();
        else void query.refetch();
    }

    /** A ref: the next page comes as this element scrolls into view. */
    function watchEnd(el: HTMLElement) {
        if (typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(
            (entries) => entries.some((e) => e.isIntersecting) && loadMore(),
            { rootMargin: '400px' }
        );
        observer.observe(el);
        onCleanup(() => observer.disconnect());
    }

    return {
        key,
        /** The loaded pages, each its items, in order. */
        pages,
        items,
        more,
        loading,
        loaded,
        error,
        /** While a next page is on its way (not the first one). */
        fetchingMore: () => query.isFetchingNextPage,
        /** While the list or a page is asked for again (for LoadError). */
        retrying: () => query.isFetching,
        loadMore,
        retry,
        watchEnd,
    };
}

/** A list fetched a page at a time (createPagedList). */
export type PagedList<T> = ReturnType<typeof createPagedList<T>>;

/**
 * The list with a fresh first page merged in by id: items it did not hold
 * go on top of its first page (in the head's order), items it held are
 * replaced where they are. The order of the rest stays; a page with
 * nothing to replace stays the same object.
 */
export function mergeHead<T>(
    data: CursorListData<T>,
    head: Page<T>,
    getId: (item: T) => string
): CursorListData<T> {
    const fresh = new Map(head.items.map((item) => [getId(item), item]));
    const held = new Set<string>();
    const pages = data.pages.map((page) => {
        let changed = false;
        const items = page.items.map((item) => {
            const id = getId(item);
            const now = fresh.get(id);
            if (now === undefined) return item;
            held.add(id);
            changed = true;
            return now;
        });
        return changed ? { ...page, items } : page;
    });
    const added = head.items.filter((item) => !held.has(getId(item)));
    if (added.length > 0 && pages.length > 0)
        pages[0] = { ...pages[0], items: [...added, ...pages[0].items] };
    return { ...data, pages };
}

/**
 * Fetches the first page of `list` again and merges it in by id
 * (mergeHead): deeper pages and the scroll stay. For a new item that shows
 * on top. Skipped while the list is not in the cache, or fetches (a next
 * page on its way would overwrite the merge: the next change catches up).
 * A failed fetch leaves the list as it is.
 */
export async function refreshHead<T>(
    client: QueryClient,
    list: CursorListOptions<T>,
    getId: (item: T) => string
) {
    const key = list.queryKey;
    const fetchPage = list.queryFn;
    const state = client.getQueryState(key);
    if (typeof fetchPage !== 'function') return;
    if (!state?.data || state.fetchStatus === 'fetching') return;
    let head: Page<T>;
    try {
        // Through Query too: seen in devtools, cancelled with the session.
        head = await client.fetchQuery({
            queryKey: [...key, 'head'],
            // The list's own key in the context, not the head key: a queryFn
            // that reads it sees the same key as when it loads the list.
            queryFn: (context) =>
                fetchPage({
                    ...context,
                    queryKey: key,
                    pageParam: undefined,
                    direction: 'forward',
                }),
            staleTime: 0,
        });
    } catch {
        return;
    }
    client.setQueryData<CursorListData<T>>(
        key,
        (data) => data && mergeHead(data, head, getId)
    );
}

/**
 * Pages with each item changed by `change` (the same item: unchanged);
 * the same object when no item changed.
 */
function mapItems<T>(
    data: CursorListData<T>,
    change: (items: T[]) => T[]
): CursorListData<T> {
    let changed = false;
    const pages = data.pages.map((page) => {
        const items = change(page.items);
        if (
            items.length === page.items.length &&
            items.every((item, i) => item === page.items[i])
        )
            return page;
        changed = true;
        return { ...page, items };
    });
    return changed ? { ...data, pages } : data;
}

/** Writes `next` of the list at `key`, unless it is what is there. */
function update<T>(
    client: QueryClient,
    key: QueryKey,
    next: (data: CursorListData<T>) => CursorListData<T>
) {
    client.setQueryData<CursorListData<T>>(key, (data) => {
        if (!data) return data;
        const changed = next(data);
        // undefined: nothing written (the list stays fresh or stale as it was).
        return changed === data ? undefined : changed;
    });
}

/** Updates one known item wherever it is among the loaded pages: no request. */
export function patchItem<T>(
    client: QueryClient,
    key: QueryKey,
    id: string,
    patch: Partial<T>,
    getId: (item: T) => string
) {
    update<T>(client, key, (data) =>
        mapItems(data, (items) =>
            items.map((item) =>
                getId(item) === id ? { ...item, ...patch } : item
            )
        )
    );
}

/** Takes one item out wherever it is among the loaded pages: no request. */
export function removeItem<T>(
    client: QueryClient,
    key: QueryKey,
    id: string,
    getId: (item: T) => string
) {
    update<T>(client, key, (data) =>
        mapItems(data, (items) => items.filter((item) => getId(item) !== id))
    );
}

/**
 * A new item at the end of a list read oldest first: on its last page once
 * all pages are loaded; otherwise it comes with the pages still to load.
 * No request.
 */
export function appendItem<T>(client: QueryClient, key: QueryKey, item: T) {
    update<T>(client, key, (data) => {
        const last = data.pages.at(-1);
        if (!last || last.next !== null) return data;
        return {
            ...data,
            pages: [
                ...data.pages.slice(0, -1),
                { ...last, items: [...last.items, item] },
            ],
        };
    });
}
