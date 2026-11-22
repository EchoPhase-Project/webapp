import { Match, Switch, type Accessor, type JSX } from 'solid-js';
import type { UseQueryResult } from '@tanstack/solid-query';
import { isNotFound } from '@shared/api/client';
import EmptyState from '@shared/ui/EmptyState';
import LoadError from '@shared/ui/LoadError';
import { SkeletonScope } from '@shared/ui/Skeleton';

/**
 * The states of data that a read gives, in one place: QueryState (one
 * query) and Paginated (a list in pages) are built on it. In this order:
 * an error → `LoadError` with a retry (or the not-found text); the first
 * load → the children in a `SkeletonScope` (with `skeleton`), or
 * `loading`; nothing in the data → the `empty` text in an `EmptyState`;
 * else the children. The children stay the same from the first load to
 * the data, so nothing is made again when it comes.
 */
export function DataState(props: {
    /** Why the read failed; nothing while it has not. */
    error: Error | null | undefined;
    /** While it is asked for again. */
    retrying: boolean;
    onRetry: () => unknown;
    /** The first load: no data yet. */
    pending: boolean;
    /** Shows the children in their loading form while pending. */
    skeleton?: boolean;
    /** What shows while pending without `skeleton` (nothing by default). */
    loading?: JSX.Element;
    /** The data has nothing to show. */
    empty?: boolean;
    /** The text for `empty`; without it, the children show empty data. */
    emptyText?: JSX.Element;
    /** An action under the empty text (a button, a link). */
    emptyAction?: JSX.Element;
    /** The text for a 404, in place of the error (not yours, deleted). */
    notFound?: JSX.Element;
    children: JSX.Element;
}) {
    const failed = () => props.error ?? undefined;
    const gone = () =>
        props.notFound !== undefined && isNotFound(props.error ?? undefined);
    const showEmpty = () =>
        !props.pending && !!props.empty && props.emptyText !== undefined;
    return (
        <Switch>
            <Match when={gone()}>
                <EmptyState>{props.notFound}</EmptyState>
            </Match>
            <Match when={failed()}>
                {(error) => (
                    <LoadError
                        error={error()}
                        busy={props.retrying}
                        onRetry={props.onRetry}
                    />
                )}
            </Match>
            <Match when={props.pending && !props.skeleton}>
                {props.loading}
            </Match>
            <Match when={showEmpty()}>
                <EmptyState action={props.emptyAction}>
                    {props.emptyText}
                </EmptyState>
            </Match>
            <Match when={props.skeleton}>
                <SkeletonScope when={props.pending}>
                    {props.children}
                </SkeletonScope>
            </Match>
            <Match when={true}>{props.children}</Match>
        </Switch>
    );
}

/** What QueryState reads of a query (useQuery's result). */
export type QueryLike<T> = Pick<
    UseQueryResult<T, Error>,
    'data' | 'error' | 'isPending' | 'isFetching' | 'refetch'
>;

/**
 * One read on a page, in its states (see DataState): its error with a
 * retry, its first load, its empty data, its data. Given a `placeholder`,
 * the children show it in their loading form (a `SkeletonScope`) while the
 * read is pending: a `Table` shows rows of bars. Without one, nothing (or
 * `loading`) shows until the data comes.
 */
export default function QueryState<T>(props: {
    query: QueryLike<T>;
    /** The data of the loading form (`[]` for a list). */
    placeholder?: T;
    /** What shows while pending, without a placeholder. */
    loading?: JSX.Element;
    /** The text when the data has nothing: an `EmptyState`. */
    empty?: JSX.Element;
    /** An action under the empty text. */
    emptyAction?: JSX.Element;
    /** When the data has nothing (an empty array by default). */
    isEmpty?: (data: T) => boolean;
    /** The text for a 404, in place of the error. */
    notFound?: JSX.Element;
    /** The data, or the placeholder while pending. */
    children: (data: Accessor<T>) => JSX.Element;
}) {
    // The children show only with the data, or with the placeholder while
    // pending (DataState): one of the two is there.
    const data = () => (props.query.data ?? props.placeholder) as T;
    const empty = () => {
        const value = props.query.data;
        if (value === undefined) return false;
        return props.isEmpty
            ? props.isEmpty(value)
            : Array.isArray(value) && value.length === 0;
    };
    return (
        <DataState
            error={props.query.error}
            retrying={props.query.isFetching}
            onRetry={() => props.query.refetch()}
            pending={props.query.isPending}
            skeleton={props.placeholder !== undefined}
            loading={props.loading}
            empty={empty()}
            emptyText={props.empty}
            emptyAction={props.emptyAction}
            notFound={props.notFound}
        >
            {props.children(data)}
        </DataState>
    );
}
