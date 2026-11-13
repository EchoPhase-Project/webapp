import { createSignal, onCleanup } from 'solid-js';

/** A page of a list, and where the next one starts (null: no more). */
export type Page<T> = { items: T[]; next: string | null };

/**
 * A list fetched a page at a time, by cursor, the pages added up.
 * `fetchPage` answers null when the call failed: the list stays as it is.
 * A reset makes the answers to older calls stale; they are dropped.
 */
export function createPagedList<T>(
    fetchPage: (cursor?: string) => Promise<Page<T> | null>
) {
    const [items, setItems] = createSignal<T[]>([]);
    // Where the next page starts; null: nothing more.
    const [next, setNext] = createSignal<string | null>(null);
    const [loading, setLoading] = createSignal(false);
    const [loaded, setLoaded] = createSignal(false);
    let generation = 0;

    async function load(more: boolean) {
        const mine = generation;
        setLoading(true);
        try {
            const page = await fetchPage(
                more ? (next() ?? undefined) : undefined
            );
            if (mine !== generation || !page) return;
            setItems((list) => (more ? [...list, ...page.items] : page.items));
            setNext(page.next);
            setLoaded(true);
        } finally {
            if (mine === generation) setLoading(false);
        }
    }

    /**
     * Fetches the first page again. By default the list empties first (a
     * new search); `keep` leaves it shown until the new page is there.
     */
    function reset(options: { keep?: boolean } = {}) {
        generation++;
        if (!options.keep) {
            setLoaded(false);
            setItems([]);
            setNext(null);
        }
        return load(false);
    }

    /** The next page, unless there is none or one is on its way. */
    function loadMore() {
        if (next() && !loading()) void load(true);
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

    const more = () => !!next();

    return {
        items,
        setItems,
        more,
        loading,
        loaded,
        reset,
        loadMore,
        watchEnd,
    };
}
