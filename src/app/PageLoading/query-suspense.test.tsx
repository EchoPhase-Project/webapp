// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createSignal, Suspense } from 'solid-js';
import { render, screen, waitFor } from '@solidjs/testing-library';
import {
    QueryClient,
    QueryClientProvider,
    useQuery,
} from '@tanstack/solid-query';

// Why the layout has no <Suspense> around the page: a query's data is a
// Solid resource, and its first read under a boundary suspends the page.

function later<T>(value: T, ms = 20) {
    return new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
}

function inSuspense(Body: () => Element | null) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(() => (
        <QueryClientProvider client={client}>
            <Suspense fallback={<p>fallback</p>}>
                <Body />
            </Suspense>
        </QueryClientProvider>
    ));
}

describe('TanStack Solid Query under <Suspense>', () => {
    it('suspends on a read of data while the first load is pending', async () => {
        inSuspense(() => {
            const query = useQuery(() => ({
                queryKey: ['a'],
                queryFn: () => later('data'),
            }));
            return (<p>page: {query.data ?? 'none'}</p>) as Element;
        });
        expect(screen.getByText('fallback')).toBeTruthy();
        expect(screen.queryByText(/page:/)).toBeNull();
        expect(await screen.findByText('page: data')).toBeTruthy();
    });

    it('does not suspend on isPending alone', async () => {
        inSuspense(() => {
            const query = useQuery(() => ({
                queryKey: ['b'],
                queryFn: () => later('data'),
            }));
            return (
                <p>page: {query.isPending ? 'loading' : 'ready'}</p>
            ) as Element;
        });
        expect(screen.getByText('page: loading')).toBeTruthy();
        expect(screen.queryByText('fallback')).toBeNull();
        expect(await screen.findByText('page: ready')).toBeTruthy();
    });

    it('suspends the shown page again for a new key', async () => {
        const [id, setId] = createSignal(1);
        inSuspense(() => {
            const query = useQuery(() => ({
                queryKey: ['c', id()],
                queryFn: () => later(`item ${id()}`),
            }));
            return (<p>page: {query.data ?? 'none'}</p>) as Element;
        });
        await screen.findByText('page: item 1');

        setId(2);
        await waitFor(() => expect(screen.getByText('fallback')).toBeTruthy());
        expect(await screen.findByText('page: item 2')).toBeTruthy();
    });
});
