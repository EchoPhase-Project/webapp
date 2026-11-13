import { createRoot } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { createPagedList, type Page } from './paged-list';

/** Answers that the test hands out by hand, in any order. */
function pages() {
    const calls: {
        cursor?: string;
        answer: (page: Page<number> | null) => void;
    }[] = [];
    const fetchPage = (cursor?: string) =>
        new Promise<Page<number> | null>((answer) =>
            calls.push({ cursor, answer })
        );
    return { calls, fetchPage };
}

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('createPagedList', () => {
    it('appends the next page, from the cursor of the last', async () => {
        const { calls, fetchPage } = pages();
        const list = createRoot(() => createPagedList(fetchPage));

        void list.reset();
        expect(list.loading()).toBe(true);
        calls[0]?.answer({ items: [1, 2], next: 'c2' });
        await settle();
        expect(list.items()).toEqual([1, 2]);
        expect(list.more()).toBe(true);
        expect(list.loaded()).toBe(true);

        list.loadMore();
        list.loadMore(); // One page at a time.
        expect(calls).toHaveLength(2);
        expect(calls[1]?.cursor).toBe('c2');
        calls[1]?.answer({ items: [3], next: null });
        await settle();
        expect(list.items()).toEqual([1, 2, 3]);
        expect(list.more()).toBe(false);
        expect(list.loading()).toBe(false);

        list.loadMore();
        expect(calls).toHaveLength(2);
    });

    it('drops the answer to a call older than a reset', async () => {
        const { calls, fetchPage } = pages();
        const list = createRoot(() => createPagedList(fetchPage));

        void list.reset();
        void list.reset();
        calls[1]?.answer({ items: [9], next: null });
        calls[0]?.answer({ items: [1], next: 'stale' });
        await settle();

        expect(list.items()).toEqual([9]);
        expect(list.more()).toBe(false);
        expect(list.loading()).toBe(false);
    });

    it('empties on reset, or keeps the list until the new page', async () => {
        const { calls, fetchPage } = pages();
        const list = createRoot(() => createPagedList(fetchPage));
        void list.reset();
        calls[0]?.answer({ items: [1], next: null });
        await settle();

        void list.reset({ keep: true });
        expect(list.items()).toEqual([1]);
        expect(list.loaded()).toBe(true);
        calls[1]?.answer({ items: [2], next: null });
        await settle();
        expect(list.items()).toEqual([2]);

        void list.reset();
        expect(list.items()).toEqual([]);
        expect(list.loaded()).toBe(false);
    });

    it('keeps the list as it is when a call fails', async () => {
        const { calls, fetchPage } = pages();
        const list = createRoot(() => createPagedList(fetchPage));
        void list.reset();
        calls[0]?.answer({ items: [1], next: 'c1' });
        await settle();

        list.loadMore();
        calls[1]?.answer(null);
        await settle();
        expect(list.items()).toEqual([1]);
        expect(list.more()).toBe(true);
        expect(list.loading()).toBe(false);
    });
});
