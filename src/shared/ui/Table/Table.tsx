import { For, Index, Show, JSX, Component, ParentComponent } from 'solid-js';
import { useI18n } from '@shared/i18n/i18n-context';
import EmptyState from '@shared/ui/EmptyState';
import { SkeletonText, useSkeleton } from '@shared/ui/Skeleton';
import './table.scss';

type DataLabel = string;

/** Handlers a cell or row may take (spread onto the element). */
type Handlers<T extends HTMLElement> = Pick<
    JSX.HTMLAttributes<T>,
    | 'onClick'
    | 'onDblClick'
    | 'onContextMenu'
    | 'onKeyDown'
    | 'onPointerEnter'
    | 'onPointerLeave'
>;

type CellProps = {
    label: DataLabel;
    text?: string;
    /** Translation key for text; text is the fallback. */
    i18n?: string;
    events?: Handlers<HTMLTableCellElement>;
    props?: JSX.HTMLAttributes<HTMLTableCellElement>;
};

type RowProps = {
    events?: Handlers<HTMLTableRowElement>;
};

export const Cell: ParentComponent<CellProps> = (props) => {
    const { t } = useI18n();
    return (
        <td
            data-label={props.label}
            title={props.text}
            {...props.props}
            {...props.events}
        >
            {props.children ?? (
                <span>
                    {props.i18n ? t(props.i18n, props.text) : props.text}
                </span>
            )}
        </td>
    );
};

export const Row: ParentComponent<RowProps> = (props) => {
    return (
        <tr class="row" {...props.events}>
            {props.children}
        </tr>
    );
};

type RowFactoryProps<T> = {
    item: T;
};

type TableProps<T> = {
    data: T[];
    headers: DataLabel[];
    placeholder: Component;
    /** Renders one row (usually a <Row>) for an item. */
    render: (props: RowFactoryProps<T>) => JSX.Element;
    tableProps?: JSX.HTMLAttributes<HTMLTableElement>;
    /** Rows of bars in the loading form (3 by default). */
    skeletonRows?: number;
};

/**
 * Items in rows under a header row; below 768px each row is a card. Its
 * loading form (in a `SkeletonScope` that loads) is the same table with
 * rows of bars, one bar for each column, and never the empty text.
 */
export function Table<T>(props: TableProps<T>) {
    const loading = useSkeleton();
    return (
        <Show
            when={props.data.length > 0 || loading()}
            fallback={
                <EmptyState>
                    <props.placeholder />
                </EmptyState>
            }
        >
            <table {...props.tableProps}>
                <thead>
                    <tr class="headers">
                        <For each={props.headers}>
                            {(header) => <th>{header}</th>}
                        </For>
                    </tr>
                </thead>
                <tbody>
                    <Show
                        when={!loading()}
                        fallback={
                            <SkeletonRows
                                headers={props.headers}
                                rows={props.skeletonRows ?? 3}
                            />
                        }
                    >
                        <For each={props.data}>
                            {(item) => props.render({ item })}
                        </For>
                    </Show>
                </tbody>
            </table>
        </Show>
    );
}

/** Rows of bars, with the labels that the phone layout shows. */
function SkeletonRows(props: { headers: DataLabel[]; rows: number }) {
    return (
        <Index each={Array.from({ length: props.rows })}>
            {(_, row) => (
                <tr class="row table-skeleton-row">
                    <For each={props.headers}>
                        {(header, column) => (
                            <td data-label={header}>
                                <SkeletonText
                                    // Rows of different lengths, as real text.
                                    width={`${[80, 60, 70][(row + column()) % 3]}%`}
                                />
                            </td>
                        )}
                    </For>
                </tr>
            )}
        </Index>
    );
}
