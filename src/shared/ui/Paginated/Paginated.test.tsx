// @vitest-environment jsdom
import { createSignal, For, type Accessor } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { infiniteQueryOptions } from '@tanstack/solid-query';
import { ApiError } from '@shared/api/client';
import {
    createPagedList,
    cursorPages,
    type Page,
} from '@shared/api/paged-list';
import { expectNoA11yViolations } from '@shared/testing/axe';
import { renderPage } from '@shared/testing/render-page';
import { Cell, Row, Table } from '@shared/ui/Table';
import Paginated, { paginatedItem, type PageMode } from '.';

type Item = { id: string; name: string };

/** Requests that the test answers by hand. */
function server() {
    const calls: {
        q: string;
        cursor?: string;
        answer: (page: Page<Item>) => void;
        fail: (error: Error) => void;
    }[] = [];
    const describe = (q: string) =>
        infiniteQueryOptions({
            queryKey: ['items', { q }],
            queryFn: ({ pageParam }) =>
                new Promise<Page<Item>>((answer, fail) =>
                    calls.push({ q, cursor: pageParam, answer, fail })
                ),
            ...cursorPages,
        });
    return { calls, describe };
}

/** A page of `count` items named `<prefix>1…`, and the cursor after it. */
const page = (prefix: string, count: number, next: string | null) => ({
    items: Array.from({ length: count }, (_, i) => ({
        id: `${prefix}${i + 1}`,
        name: `${prefix}${i + 1}`,
    })),
    next,
});

const boom = () => new ApiError([{ code: 'Boom', message: 'It broke.' }], 500);

/** Items in a table, each row marked; or in a plain list. */
function ItemTable(props: { items: Accessor<Item[]> }) {
    return (
        <Table
            data={props.items()}
            headers={['Name']}
            placeholder={() => <>Nothing in the table.</>}
            render={({ item }) => (
                <Row props={paginatedItem}>
                    <Cell label="Name">
                        <a href={`#${item.id}`}>{item.name}</a>
                    </Cell>
                </Row>
            )}
        />
    );
}

function renderList(options: { mode?: PageMode; empty?: string } = {}) {
    const { calls, describe } = server();
    const [q, setQ] = createSignal('');
    renderPage(() => {
        const list = createPagedList(() => describe(q()));
        return (
            <Paginated list={list} mode={options.mode} empty={options.empty}>
                {(items) => <ItemTable items={items} />}
            </Paginated>
        );
    });
    return { calls, setQ };
}

const names = () =>
    [...document.querySelectorAll('tbody tr:not(.table-skeleton-row)')].map(
        (row) => row.textContent
    );
const status = () =>
    document.querySelector('.paginated > [role="status"]')?.textContent;
const pageText = () => document.querySelector('.paginated-page')?.textContent;
const button = (name: string) => screen.getByRole('button', { name });

describe('Paginated, mode more', () => {
    it('shows the table in its loading form, then the first page and Show more', async () => {
        const { calls } = renderList();
        await waitFor(() => expect(calls).toHaveLength(1));
        expect(document.querySelectorAll('.table-skeleton-row')).toHaveLength(
            3
        );
        expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();

        calls[0]?.answer(page('a', 2, 'c1'));
        await waitFor(() => expect(names()).toEqual(['a1', 'a2']));
        expect(button('Show more')).toBeTruthy();
        await expectNoA11yViolations();
    });

    it('adds the next page, focuses its first item and says what came', async () => {
        const { calls } = renderList();
        await waitFor(() => expect(calls).toHaveLength(1));
        calls[0]?.answer(page('a', 2, 'c1'));
        await waitFor(() => expect(names()).toHaveLength(2));

        fireEvent.click(button('Show more'));
        await waitFor(() => expect(calls).toHaveLength(2));
        expect(calls[1]?.cursor).toBe('c1');
        await waitFor(() =>
            expect(button('Show more').getAttribute('aria-busy')).toBe('true')
        );
        calls[1]?.answer(page('b', 2, null));

        await waitFor(() => expect(names()).toEqual(['a1', 'a2', 'b1', 'b2']));
        expect(document.activeElement?.textContent).toBe('b1');
        expect(status()).toBe('Loaded 2 more. No more.');
        expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
    });

    it('shows a failed first page as LoadError, and Try again asks again', async () => {
        const { calls } = renderList();
        await waitFor(() => expect(calls).toHaveLength(1));
        calls[0]?.fail(boom());
        await waitFor(() => expect(screen.getByText('It broke.')).toBeTruthy());
        expect(document.querySelector('table')).toBeNull();
        await expectNoA11yViolations();

        fireEvent.click(button('Try again'));
        await waitFor(() => expect(calls).toHaveLength(2));
        calls[1]?.answer(page('a', 1, null));
        await waitFor(() => expect(names()).toEqual(['a1']));
        expect(screen.queryByText('It broke.')).toBeNull();
    });

    it('keeps the items when a next page fails, and Try again asks for that page', async () => {
        const { calls } = renderList();
        await waitFor(() => expect(calls).toHaveLength(1));
        calls[0]?.answer(page('a', 1, 'c1'));
        await waitFor(() => expect(names()).toEqual(['a1']));
        fireEvent.click(button('Show more'));
        await waitFor(() => expect(calls).toHaveLength(2));
        calls[1]?.fail(boom());

        await waitFor(() => expect(screen.getByText('It broke.')).toBeTruthy());
        expect(names()).toEqual(['a1']);
        fireEvent.click(button('Try again'));
        await waitFor(() => expect(calls).toHaveLength(3));
        expect(calls[2]?.cursor).toBe('c1');
    });

    it('shows the empty text for a list with nothing', async () => {
        const { calls } = renderList({ empty: 'No items yet.' });
        await waitFor(() => expect(calls).toHaveLength(1));
        calls[0]?.answer(page('a', 0, null));
        await waitFor(() =>
            expect(screen.getByText('No items yet.')).toBeTruthy()
        );
        expect(document.querySelector('table')).toBeNull();
    });
});

describe('Paginated, mode pages', () => {
    /** The first page of three items, then the second, through Next. */
    async function twoPages() {
        const list = renderList({ mode: 'pages' });
        const { calls } = list;
        await waitFor(() => expect(calls).toHaveLength(1));
        calls[0]?.answer(page('a', 3, 'c1'));
        await waitFor(() => expect(names()).toEqual(['a1', 'a2', 'a3']));
        expect(pageText()).toBe('Page 1');
        expect((button('Previous') as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(button('Next'));
        await waitFor(() => expect(calls).toHaveLength(2));
        expect(calls[1]?.cursor).toBe('c1');
        // The old page stays until the new one comes.
        expect(names()).toEqual(['a1', 'a2', 'a3']);
        calls[1]?.answer(page('b', 2, 'c2'));
        await waitFor(() => expect(names()).toEqual(['b1', 'b2']));
        return list;
    }

    it('shows one page; Next asks for a page not loaded yet and focuses its first item', async () => {
        await twoPages();
        expect(pageText()).toBe('Page 2');
        expect(status()).toBe('Page 2');
        expect(document.activeElement?.textContent).toBe('b1');
        await expectNoA11yViolations();
    });

    it('goes back without a request, and Next asks only for an uncached page', async () => {
        const { calls } = await twoPages();

        fireEvent.click(button('Previous'));
        await waitFor(() => expect(names()).toEqual(['a1', 'a2', 'a3']));
        expect(status()).toBe('Page 1');
        expect(document.activeElement?.textContent).toBe('a1');

        fireEvent.click(button('Next'));
        await waitFor(() => expect(names()).toEqual(['b1', 'b2']));
        expect(calls).toHaveLength(2);

        fireEvent.click(button('Next'));
        await waitFor(() => expect(calls).toHaveLength(3));
        expect(calls[2]?.cursor).toBe('c2');
    });

    it('disables Next on the last page', async () => {
        const { calls } = renderList({ mode: 'pages' });
        await waitFor(() => expect(calls).toHaveLength(1));
        calls[0]?.answer(page('a', 2, 'c1'));
        await waitFor(() => expect(names()).toHaveLength(2));
        fireEvent.click(button('Next'));
        await waitFor(() => expect(calls).toHaveLength(2));
        calls[1]?.answer(page('b', 1, null));
        await waitFor(() => expect(names()).toEqual(['b1']));
        expect((button('Next') as HTMLButtonElement).disabled).toBe(true);
    });

    it('starts on the first page for a new query', async () => {
        const { calls, setQ } = await twoPages();

        setQ('raid');
        await waitFor(() => expect(calls).toHaveLength(3));
        expect(calls[2]?.q).toBe('raid');
        expect(calls[2]?.cursor).toBeUndefined();
        calls[2]?.answer(page('r', 2, 'c1'));
        await waitFor(() => expect(names()).toEqual(['r1', 'r2']));
        expect(pageText()).toBe('Page 1');
        expect(status()).toBe('');
    });
});

describe('createPagination in a list of its own', () => {
    it('focuses an item marked in a plain list', async () => {
        const { calls, describe } = server();
        renderPage(() => {
            const list = createPagedList(() => describe(''));
            return (
                <Paginated list={list}>
                    {(items) => (
                        <ul>
                            <For each={items()}>
                                {(item) => (
                                    <li {...paginatedItem}>{item.name}</li>
                                )}
                            </For>
                        </ul>
                    )}
                </Paginated>
            );
        });
        await waitFor(() => expect(calls).toHaveLength(1));
        calls[0]?.answer(page('a', 1, 'c1'));
        await waitFor(() => expect(button('Show more')).toBeTruthy());
        fireEvent.click(button('Show more'));
        await waitFor(() => expect(calls).toHaveLength(2));
        calls[1]?.answer(page('b', 1, 'c2'));
        await waitFor(() =>
            expect(document.activeElement?.textContent).toBe('b1')
        );
        // No control in it: the item itself takes the focus.
        expect(document.activeElement?.tagName).toBe('LI');
        expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
        expect(status()).toBe('Loaded 1 more');
    });
});
