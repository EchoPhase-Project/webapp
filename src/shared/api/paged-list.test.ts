// @vitest-environment jsdom
import { createSignal } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { waitFor } from '@solidjs/testing-library';
import { infiniteQueryOptions, type QueryKey } from '@tanstack/solid-query';
import { ApiError } from '@shared/api/client';
import { sessionClient } from '@shared/api/session-provider';
import { withSession } from '@shared/testing/render-page';
import {
    createPagedList,
    cursorPages,
    appendItem,
    mergeHead,
    patchItem,
    refreshHead,
    removeItem,
    type CursorListData,
    type Page,
} from './paged-list';

type Item = { id: string; n: number };

const item = (id: string, n = 0): Item => ({ id, n });
const id = (i: Item) => i.id;

/** Answers that the test hands out by hand, in any order. */
function pages() {
    const calls: {
        key: QueryKey;
        cursor?: string;
        signal: AbortSignal;
        answer: (page: Page<Item>) => void;
        fail: (error: Error) => void;
    }[] = [];
    const describe = (q = '') =>
        infiniteQueryOptions({
            queryKey: ['items', 'list', { q }],
            queryFn: ({ queryKey, pageParam, signal }) =>
                new Promise<Page<Item>>((answer, fail) =>
                    calls.push({
                        key: queryKey,
                        cursor: pageParam,
                        signal,
                        answer,
                        fail,
                    })
                ),
            ...cursorPages,
        });
    return { calls, describe };
}

const settle = () => new Promise((resolve) => setTimeout(resolve));

/** Cached list data of these pages (cursors: c1, c2, …). */
const data = (...items: Item[][]): CursorListData<Item> => ({
    pages: items.map((page, i) => ({
        items: page,
        next: i < items.length - 1 ? `c${i + 1}` : null,
    })),
    pageParams: items.map((_, i) => (i === 0 ? undefined : `c${i}`)),
});

describe('createPagedList', () => {
    it('adds the pages up, one page at a time, from the cursor of the last', async () => {
        const { calls, describe } = pages();
        const list = withSession(() => createPagedList(() => describe()));

        expect(list.loading()).toBe(true);
        expect(list.loaded()).toBe(false);
        await waitFor(() => expect(calls).toHaveLength(1));
        expect(calls[0]?.cursor).toBeUndefined();
        calls[0]?.answer({ items: [item('a'), item('b')], next: 'c1' });
        await waitFor(() => expect(list.loaded()).toBe(true));
        expect(list.items().map(id)).toEqual(['a', 'b']);
        expect(list.more()).toBe(true);
        expect(list.loading()).toBe(false);

        list.loadMore();
        list.loadMore(); // One page at a time.
        await settle();
        expect(calls).toHaveLength(2);
        expect(calls[1]?.cursor).toBe('c1');
        expect(list.loading()).toBe(true);
        calls[1]?.answer({ items: [item('c')], next: null });
        await waitFor(() =>
            expect(list.items().map(id)).toEqual(['a', 'b', 'c'])
        );
        expect(list.loading()).toBe(false);
        expect(list.more()).toBe(false);

        list.loadMore(); // Nothing more.
        await settle();
        expect(calls).toHaveLength(2);
    });

    it('starts over for a new key, and cancels the request for the old one', async () => {
        const { calls, describe } = pages();
        const [q, setQ] = createSignal('');
        const list = withSession(() => createPagedList(() => describe(q())));
        await waitFor(() => expect(calls).toHaveLength(1));
        calls[0]?.answer({ items: [item('a')], next: 'c1' });
        await waitFor(() => expect(list.loaded()).toBe(true));
        list.loadMore();
        await waitFor(() => expect(calls).toHaveLength(2));

        setQ('raid');
        await waitFor(() => expect(calls).toHaveLength(3));
        expect(calls[1]?.signal.aborted).toBe(true);
        expect(calls[2]?.cursor).toBeUndefined();
        expect(calls[2]?.key).toEqual(['items', 'list', { q: 'raid' }]);
        await waitFor(() => expect(list.items()).toEqual([]));
        expect(list.loaded()).toBe(false);
        calls[2]?.answer({ items: [item('r')], next: null });
        await waitFor(() => expect(list.items().map(id)).toEqual(['r']));
    });

    it('shows a failed first page in error, and a failed next page with the list kept', async () => {
        const { calls, describe } = pages();
        const list = withSession(() => createPagedList(() => describe()));
        await waitFor(() => expect(calls).toHaveLength(1));
        const failure = new ApiError([{ code: 'Boom', message: 'No.' }], 500);
        calls[0]?.fail(failure);
        await waitFor(() => expect(list.error()).toBe(failure));
        expect(list.loaded()).toBe(false);
        expect(list.loading()).toBe(false);

        list.retry();
        await waitFor(() => expect(calls).toHaveLength(2));
        calls[1]?.answer({ items: [item('a')], next: 'c1' });
        await waitFor(() => expect(list.items().map(id)).toEqual(['a']));
        expect(list.error()).toBeNull();

        list.loadMore();
        await waitFor(() => expect(calls).toHaveLength(3));
        calls[2]?.fail(failure);
        await waitFor(() => expect(list.error()).toBe(failure));
        expect(list.items().map(id)).toEqual(['a']);
        expect(list.loaded()).toBe(true);

        // The next page is asked for again, not the list.
        list.retry();
        await waitFor(() => expect(calls).toHaveLength(4));
        expect(calls[3]?.cursor).toBe('c1');
    });

    it('does not show loading for a background refetch', async () => {
        const { calls, describe } = pages();
        const list = withSession(() => createPagedList(() => describe()));
        await waitFor(() => expect(calls).toHaveLength(1));
        calls[0]?.answer({ items: [item('a')], next: null });
        await waitFor(() => expect(list.loaded()).toBe(true));

        void sessionClient().invalidateQueries({ queryKey: ['items'] });
        await waitFor(() => expect(calls).toHaveLength(2));
        await waitFor(() => expect(list.retrying()).toBe(true));
        expect(list.loading()).toBe(false);
        expect(list.items().map(id)).toEqual(['a']);
    });
});

describe('mergeHead', () => {
    it('puts new items on top, replaces known ones where they are, leaves deep pages', () => {
        const before = data(
            [item('c'), item('b', 1), item('a')],
            [item('z'), item('y')]
        );
        const merged = mergeHead(
            before,
            {
                items: [item('e'), item('d'), item('c'), item('b', 2)],
                next: 'x',
            },
            id
        );

        expect(merged.pages[0]?.items).toEqual([
            item('e'),
            item('d'),
            item('c'),
            item('b', 2),
            item('a'),
        ]);
        expect(merged.pages[0]?.next).toBe('c1');
        expect(merged.pages[1]).toBe(before.pages[1]);
        expect(merged.pageParams).toEqual(before.pageParams);
    });

    it('adds no duplicates when merged twice', () => {
        const head = { items: [item('b'), item('a')], next: null };
        const once = mergeHead(data([item('a')]), head, id);
        expect(mergeHead(once, head, id).pages[0]?.items.map(id)).toEqual([
            'b',
            'a',
        ]);
    });

    it('finds items by the id getId gives (runId for runs)', () => {
        const run = (runId: string, status: string) => ({ runId, status });
        const before: CursorListData<ReturnType<typeof run>> = {
            pages: [{ items: [run('r1', 'running')], next: null }],
            pageParams: [undefined],
        };
        const merged = mergeHead(
            before,
            {
                items: [run('r2', 'queued'), run('r1', 'succeeded')],
                next: null,
            },
            (r) => r.runId
        );
        expect(merged.pages[0]?.items).toEqual([
            run('r2', 'queued'),
            run('r1', 'succeeded'),
        ]);
    });
});

describe('patchItem and removeItem', () => {
    const key = ['items', 'list', { q: '' }];

    it('patch only the item of that id, on any page', () => {
        withSession(() => null);
        const client = sessionClient();
        const before = data([item('a'), item('b')], [item('c'), item('d')]);
        client.setQueryData(key, before);

        patchItem<Item>(client, key, 'd', { n: 5 }, id);
        let now = client.getQueryData<CursorListData<Item>>(key);
        expect(now?.pages[1]?.items).toEqual([item('c'), item('d', 5)]);
        expect(now?.pages[0]).toBe(before.pages[0]);

        removeItem<Item>(client, key, 'a', id);
        now = client.getQueryData<CursorListData<Item>>(key);
        expect(now?.pages.map((p) => p.items.map(id))).toEqual([
            ['b'],
            ['c', 'd'],
        ]);
    });

    it('leave the list as it was for an unknown id', () => {
        withSession(() => null);
        const client = sessionClient();
        const before = data([item('a')], [item('b')]);
        client.setQueryData(key, before);
        const updatedAt = client.getQueryState(key)?.dataUpdatedAt;

        patchItem<Item>(client, key, 'nope', { n: 1 }, id);
        removeItem<Item>(client, key, 'nope', id);

        expect(client.getQueryData(key)).toBe(before);
        expect(client.getQueryState(key)?.dataUpdatedAt).toBe(updatedAt);
    });
});

describe('appendItem', () => {
    const key = ['items', 'list', { q: '' }];

    it('adds to the last page once all are loaded, not before', () => {
        withSession(() => null);
        const client = sessionClient();
        const partial = data([item('a')], [item('b')]);
        partial.pages[1] = { ...partial.pages[1], next: 'c2' };
        client.setQueryData(key, partial);
        appendItem(client, key, item('c'));
        expect(client.getQueryData(key)).toBe(partial);

        client.setQueryData(key, data([item('a')], [item('b')]));
        appendItem(client, key, item('c'));
        expect(
            client
                .getQueryData<CursorListData<Item>>(key)
                ?.pages.map((p) => p.items.map(id))
        ).toEqual([['a'], ['b', 'c']]);
    });
});

describe('refreshHead', () => {
    it("fetches the first page through fetchQuery (the head key, the list's key in the context) and merges it", async () => {
        const { calls, describe } = pages();
        const list = withSession(() => createPagedList(() => describe()));
        const client = sessionClient();
        await waitFor(() => expect(calls).toHaveLength(1));
        calls[0]?.answer({ items: [item('b'), item('a')], next: 'c1' });
        await waitFor(() => expect(list.loaded()).toBe(true));
        list.loadMore();
        await waitFor(() => expect(calls).toHaveLength(2));
        calls[1]?.answer({ items: [item('z')], next: null });
        await waitFor(() => expect(list.items()).toHaveLength(3));

        const refreshing = refreshHead(client, describe(), id);
        await waitFor(() => expect(calls).toHaveLength(3));
        expect(calls[2]?.key).toEqual(['items', 'list', { q: '' }]);
        expect(calls[2]?.cursor).toBeUndefined();
        expect(
            client.getQueryState(['items', 'list', { q: '' }, 'head'])
                ?.fetchStatus
        ).toBe('fetching');
        calls[2]?.answer({ items: [item('c'), item('b', 1)], next: 'c9' });
        await refreshing;

        await waitFor(() => expect(list.items()).toHaveLength(4));
        expect(list.items()).toEqual([
            item('c'),
            item('b', 1),
            item('a'),
            item('z'),
        ]);
    });

    it('skips a list that is fetching, or not in the cache', async () => {
        const { calls, describe } = pages();
        const list = withSession(() => createPagedList(() => describe()));
        const client = sessionClient();
        await waitFor(() => expect(calls).toHaveLength(1));

        await refreshHead(client, describe(), id); // first page on its way
        await refreshHead(client, describe('other'), id); // not in the cache
        expect(calls).toHaveLength(1);

        calls[0]?.answer({ items: [item('a')], next: 'c1' });
        await waitFor(() => expect(list.loaded()).toBe(true));
        list.loadMore();
        await waitFor(() => expect(calls).toHaveLength(2));
        await refreshHead(client, describe(), id); // next page on its way
        expect(calls).toHaveLength(2);
    });
});

// Read as text, not imported: shared does not import features.
const listPages = import.meta.glob<string>(
    [
        '/src/features/packages/ExplorePage.tsx',
        '/src/features/packages/components/RunList.tsx',
        '/src/features/files/FilesPage.tsx',
    ],
    { query: '?raw', import: 'default', eager: true }
);

describe('the pages with a paged list', () => {
    it('take its description from their api.ts: no api or request of their own', () => {
        const sources = Object.values(listPages);
        expect(sources).toHaveLength(3);
        for (const source of sources) {
            expect(source).toContain('createPagedList(');
            expect(source).not.toContain('@shared/api/client');
            expect(source).not.toMatch(
                /import\s*\{[^}]*\b(api|request)\b[^}]*\}/
            );
        }
    });
});
