import { Show, type Accessor, type JSX } from 'solid-js';
import type { PagedList } from '@shared/api/paged-list';
import { useI18n } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import LoadError from '@shared/ui/LoadError';
import { DataState } from '@shared/ui/QueryState';
import { createPagination, type PageMode } from './pagination';
import './paginated.scss';

/**
 * A list that comes one page at a time (createPagedList), with all around
 * it: the caller draws the items (a `Table`, a `Masonry`, a list), each
 * with `paginatedItem`. The states are those of QueryState: the first load
 * in a `SkeletonScope` (a `Table` shows rows of bars), a failed first page
 * as `LoadError` in place of the list, the `empty` text. A failed next page
 * shows under the items, which stay. Mode `more` adds "Show more" (with
 * `auto`, also as the end comes in view); mode `pages` shows one page with
 * "Previous" and "Next" (see createPagination). One live region says what
 * came.
 */
export default function Paginated<T>(props: {
    list: PagedList<T>;
    /** `more` by default. */
    mode?: PageMode;
    /** Mode `more`: also loads as the end of the list comes in view. */
    auto?: boolean;
    /** The text when the list has nothing: an `EmptyState`. */
    empty?: JSX.Element;
    /** An action under the empty text. */
    emptyAction?: JSX.Element;
    /** The text of the button in mode `more` ("Show more" by default). */
    moreLabel?: string;
    /** The name of the page buttons' group ("Pages" by default). */
    label?: string;
    class?: string;
    /** The items to show: all loaded ones, or the page's. */
    children: (items: Accessor<T[]>) => JSX.Element;
}) {
    const { t } = useI18n();
    // The list is made once with its page: another search is another key
    // of the same list, not another list.
    // eslint-disable-next-line solid/reactivity
    const pages = createPagination(props.list, { mode: () => props.mode });
    const loaded = () => props.list.loaded();
    return (
        <div
            class={['paginated', props.class].filter(Boolean).join(' ')}
            ref={pages.root}
        >
            {/* Stays on the page; only its text changes. */}
            <p class="visually-hidden" role="status">
                {pages.status()}
            </p>
            <DataState
                error={loaded() ? null : props.list.error()}
                retrying={props.list.retrying()}
                onRetry={props.list.retry}
                pending={!loaded()}
                skeleton
                empty={props.list.items().length === 0}
                emptyText={props.empty}
                emptyAction={props.emptyAction}
            >
                {props.children(pages.items)}
            </DataState>
            <Show when={loaded() && props.list.error()}>
                {(error) => (
                    <LoadError
                        error={error()}
                        busy={props.list.retrying()}
                        onRetry={props.list.retry}
                    />
                )}
            </Show>
            <Show
                when={pages.mode() === 'pages'}
                fallback={
                    <Show when={loaded() && props.list.more()}>
                        <div
                            class="paginated-more"
                            ref={(el) => {
                                if (props.auto) pages.watchEnd(el);
                            }}
                        >
                            <Button
                                variant="ghost"
                                busy={pages.busy()}
                                onClick={() => pages.loadMore()}
                            >
                                {props.moreLabel ??
                                    t('ui.show_more', 'Show more')}
                            </Button>
                        </div>
                    </Show>
                }
            >
                <Show when={loaded() && (pages.hasPrev() || pages.hasNext())}>
                    <nav
                        class="paginated-pages"
                        aria-label={props.label ?? t('ui.pages', 'Pages')}
                    >
                        <Button
                            variant="ghost"
                            disabled={!pages.hasPrev()}
                            onClick={() => pages.prev()}
                        >
                            {t('ui.previous', 'Previous')}
                        </Button>
                        <span class="paginated-page">
                            {t('ui.page', 'Page {page}', {
                                page: pages.page(),
                            })}
                        </span>
                        <Button
                            variant="ghost"
                            disabled={!pages.hasNext()}
                            busy={pages.busy()}
                            onClick={() => pages.next()}
                        >
                            {t('ui.next', 'Next')}
                        </Button>
                    </nav>
                </Show>
            </Show>
        </div>
    );
}
