// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { useQuery } from '@tanstack/solid-query';
import { ApiError } from '@shared/api/client';
import { expectNoA11yViolations } from '@shared/testing/axe';
import { renderPage } from '@shared/testing/render-page';
import { Cell, Row, Table } from '@shared/ui/Table';
import QueryState from './QueryState';

type Item = { id: string; name: string };

/** A promise that the test settles. */
function later<T>() {
    let settle: { ok: (value: T) => void; fail: (e: unknown) => void } = {
        ok: () => {},
        fail: () => {},
    };
    const promise = new Promise<T>((ok, fail) => (settle = { ok, fail }));
    return { promise, ...settle };
}

const boom = () => new ApiError([{ code: 'Boom', message: 'It broke.' }], 500);
const missing = () =>
    new ApiError([{ code: 'NotFound', message: 'Not found.' }], 404);

/** A read whose answers the test hands out, shown in a QueryState. */
function renderRead(
    props: {
        placeholder?: Item[];
        empty?: string;
        notFound?: string;
        loading?: string;
    } = {}
) {
    const answers: ReturnType<typeof later<Item[]>>[] = [];
    const read = vi.fn(() => {
        const answer = later<Item[]>();
        answers.push(answer);
        return answer.promise;
    });
    renderPage(() => {
        const items = useQuery(() => ({
            queryKey: ['items'],
            queryFn: read,
        }));
        return (
            <QueryState
                query={items}
                placeholder={props.placeholder}
                empty={props.empty}
                notFound={props.notFound}
                loading={props.loading}
            >
                {(list) => (
                    <Table
                        data={list()}
                        headers={['Name']}
                        placeholder={() => <>Nothing in the table.</>}
                        render={({ item }) => (
                            <Row>
                                <Cell label="Name" text={item.name} />
                            </Row>
                        )}
                    />
                )}
            </QueryState>
        );
    });
    return { answers, read };
}

const rows = () => document.querySelectorAll('tbody tr');

describe('QueryState', () => {
    it('shows the children in their loading form while pending, then the data', async () => {
        const { answers } = renderRead({ placeholder: [] });
        await waitFor(() => expect(answers).toHaveLength(1));
        expect(
            document
                .querySelector('.skeleton-scope')
                ?.getAttribute('aria-hidden')
        ).toBe('true');
        expect(document.querySelectorAll('.table-skeleton-row')).toHaveLength(
            3
        );
        expect(screen.getByRole('status').textContent).toBe('Loading…');

        answers[0]?.ok([{ id: '1', name: 'Ann' }]);
        await waitFor(() => expect(screen.getByText('Ann')).toBeTruthy());
        expect(
            document
                .querySelector('.skeleton-scope')
                ?.hasAttribute('aria-hidden')
        ).toBe(false);
        expect(rows()).toHaveLength(1);
        await expectNoA11yViolations();
    });

    it('shows nothing while pending without a placeholder', async () => {
        const quiet = renderRead();
        await waitFor(() => expect(quiet.answers).toHaveLength(1));
        expect(document.querySelector('table')).toBeNull();
        expect(document.querySelector('.skeleton-scope')).toBeNull();
    });

    it('shows the loading text while pending without a placeholder', async () => {
        const told = renderRead({ loading: 'Wait…' });
        await waitFor(() => expect(told.answers).toHaveLength(1));
        expect(screen.getByText('Wait…')).toBeTruthy();
    });

    it('shows a failure as LoadError, and Try again reads again', async () => {
        const { answers, read } = renderRead({ placeholder: [] });
        await waitFor(() => expect(answers).toHaveLength(1));
        answers[0]?.fail(boom());
        await waitFor(() => expect(screen.getByText('It broke.')).toBeTruthy());
        expect(document.querySelector('table')).toBeNull();
        await expectNoA11yViolations();

        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
        answers[1]?.ok([{ id: '1', name: 'Ann' }]);
        await waitFor(() => expect(screen.getByText('Ann')).toBeTruthy());
        expect(screen.queryByText('It broke.')).toBeNull();
    });

    it('shows the empty text for empty data', async () => {
        const told = renderRead({ empty: 'No items yet.' });
        await waitFor(() => expect(told.answers).toHaveLength(1));
        told.answers[0]?.ok([]);
        await waitFor(() =>
            expect(screen.getByText('No items yet.')).toBeTruthy()
        );
        expect(document.querySelector('.empty-state')).not.toBeNull();
    });

    it('shows empty data in the children without the empty text', async () => {
        const plain = renderRead();
        await waitFor(() => expect(plain.answers).toHaveLength(1));
        plain.answers[0]?.ok([]);
        await waitFor(() =>
            expect(screen.getByText('Nothing in the table.')).toBeTruthy()
        );
    });

    it('shows the not-found text for a 404', async () => {
        const told = renderRead({ notFound: 'It is gone.' });
        await waitFor(() => expect(told.answers).toHaveLength(1));
        told.answers[0]?.fail(missing());
        await waitFor(() =>
            expect(screen.getByText('It is gone.')).toBeTruthy()
        );
        expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    });

    it('shows a 404 as LoadError without the not-found text', async () => {
        const plain = renderRead();
        await waitFor(() => expect(plain.answers).toHaveLength(1));
        plain.answers[0]?.fail(missing());
        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: 'Try again' })
            ).toBeTruthy()
        );
    });
});
