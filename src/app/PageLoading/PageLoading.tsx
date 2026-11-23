import {
    createComponent,
    createContext,
    createEffect,
    createSignal,
    lazy,
    on,
    onCleanup,
    Show,
    useContext,
} from 'solid-js';
import type { Accessor, Component, ParentProps } from 'solid-js';
import { useI18n } from '@shared/i18n/i18n-context';
import PageSkeleton, { type PageSkeletonForm } from '@shared/ui/PageSkeleton';

/** Marks a page's code as on its way; the function returned marks it done. */
type Track = (load: Promise<unknown>) => () => void;

const PageLoadingContext = createContext<PageLoadingState>();

/** A wait shorter than this shows nothing: a fast load does not flash. */
export const SHOW_AFTER_MS = 200;

export interface PageLoadingState {
    track: Track;
    /** A page's code is loading now. */
    pending: Accessor<boolean>;
    /** It has been loading for longer than the delay: the shape shows. */
    shown: Accessor<boolean>;
    /** The width of the page shown now, from its type (lazyPage). */
    width: Accessor<PageWidth>;
    /** Gives the page's width while the page is on the screen. */
    claimWidth: (width: PageWidth) => void;
}

/**
 * How wide a page goes on a large screen: 'text' (a document with its
 * contents beside it), 'default', or 'wide' (lists, tables and grids, which
 * show more on a large screen). The layout puts it on the page's frame.
 */
export type PageWidth = 'text' | 'default' | 'wide';

/** The width of each page type: one list, the page's skeleton form. */
export const PAGE_WIDTHS: Record<PageSkeletonForm, PageWidth> = {
    header: 'default',
    document: 'text',
    settings: 'default',
    detail: 'default',
    table: 'wide',
    cards: 'wide',
    list: 'wide',
};

/**
 * The state of the page code that is loading: made by the layout, which
 * gives it to PageLoading and waits on `pending` before it moves the focus.
 */
export function createPageLoading(delay = SHOW_AFTER_MS): PageLoadingState {
    const [count, setCount] = createSignal(0);
    const [shown, setShown] = createSignal(false);
    const pending = () => count() > 0;

    const track: Track = (load) => {
        let open = true;
        setCount((n) => n + 1);
        const done = () => {
            if (!open) return;
            open = false;
            setCount((n) => n - 1);
        };
        // A failed import is the page's own to show (PageErrorBoundary).
        load.then(done, done);
        return done;
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    createEffect(
        on(pending, (now) => {
            clearTimeout(timer);
            if (now) timer = setTimeout(() => setShown(true), delay);
            else setShown(false);
        })
    );
    onCleanup(() => clearTimeout(timer));

    // The page on the screen gives its width; a page that gives none (a
    // page of the dev playground) gets the default. A token, not the value:
    // the old page's cleanup must not take the width of the new one.
    const [claim, setClaim] = createSignal<{ width: PageWidth }>();
    const width = () => claim()?.width ?? 'default';
    const claimWidth = (value: PageWidth) => {
        const mine = { width: value };
        setClaim(mine);
        onCleanup(() => {
            if (claim() === mine) setClaim(undefined);
        });
    };

    return { track, pending, shown, width, claimWidth };
}

/**
 * "Loading…" for screen readers while a page's code loads; the page itself
 * (lazyPage) shows its shape in its place. The page in it stays as it is:
 * data that loads inside a page shows with the page's own `isPending`.
 */
export default function PageLoading(
    props: ParentProps<{ state: PageLoadingState }>
) {
    const { t } = useI18n();
    return (
        <PageLoadingContext.Provider
            // The same state for the life of the layout.
            // eslint-disable-next-line solid/reactivity
            value={props.state}
        >
            {/* Stays on the page; only its text changes. */}
            <p class="visually-hidden" role="status">
                {props.state.shown() ? t('ui.loading', 'Loading…') : ''}
            </p>
            {props.children}
        </PageLoadingContext.Provider>
    );
}

export type LazyPage<P extends object> = Component<P> & {
    /** Loads the page's code before it is shown (a hover on a link). */
    preload: () => Promise<unknown>;
};

export interface LazyPageOptions {
    /**
     * The shape of the page while its code loads (after the delay), made of
     * the shared components in their loading form: 'header' (the default),
     * 'table', 'cards', 'list', 'settings', 'detail' or 'document'. It
     * also gives the page its width (PAGE_WIDTHS).
     */
    skeleton?: PageSkeletonForm;
    /**
     * The width of the page, when it is not the width of its skeleton
     * form: a table with few columns (sessions) stays 'default'.
     */
    width?: PageWidth;
}

/**
 * `lazy(load)` for a page of the router: while its code loads, it shows its
 * shape (PageSkeleton) after the delay, and the layout says "Loading…"
 * (PageLoading). There is no <Suspense> for this: a query's `data` is a
 * Solid resource and would suspend the page too.
 */
export function lazyPage<P extends object>(
    load: () => Promise<{ default: Component<P> }>,
    options: LazyPageOptions = {}
): LazyPage<P> {
    const Page = lazy(load);
    let loaded = false;
    // The router calls it too (on a match, and on a hover over a link) and
    // drops the promise: a failed import is shown by the page's own render
    // (PageErrorBoundary), not as an unhandled rejection.
    const preload = () => {
        const loading = Page.preload().then((module) => {
            loaded = true;
            return module;
        });
        loading.catch(() => {});
        return loading;
    };
    const Wrapped = (props: P) => {
        const state = useContext(PageLoadingContext);
        state?.claimWidth(
            options.width ?? PAGE_WIDTHS[options.skeleton ?? 'header']
        );
        // Code already in (preloaded, or seen before): no shape, no count.
        const waiting = !loaded && state;
        const [ready, setReady] = createSignal(!waiting);
        if (waiting) {
            const loading = preload();
            loading.then(
                () => setReady(true),
                () => {}
            );
            onCleanup(waiting.track(loading));
        }
        return (
            <>
                <Show when={!ready() && state?.shown()}>
                    <PageSkeleton form={options.skeleton ?? 'header'} />
                </Show>
                {createComponent(Page, props)}
            </>
        );
    };
    return Object.assign(Wrapped, { preload });
}
