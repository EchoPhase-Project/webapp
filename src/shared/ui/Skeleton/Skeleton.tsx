import {
    createContext,
    Index,
    Show,
    useContext,
    type Accessor,
    type JSX,
} from 'solid-js';
import { useI18n } from '@shared/i18n/i18n-context';
import './skeleton.scss';

const SkeletonContext = createContext<Accessor<boolean>>(() => false);

/**
 * True inside a `SkeletonScope` whose data is on its way: a shared
 * component then shows its loading form (bars in the shape of its content)
 * in place of its content. The nearest scope decides.
 */
export function useSkeleton(): Accessor<boolean> {
    return useContext(SkeletonContext);
}

/**
 * A part of a page whose data is on its way. While `when` is true, the
 * shared components in it show their loading form, the part is hidden from
 * screen readers and out of reach of the keyboard (inert), and one live
 * region says "Loading…" for all of it. While it is false, the children are
 * as they would be without it. It adds no box of its own to the layout.
 */
export function SkeletonScope(props: {
    when: boolean;
    /**
     * False when a live region outside already says that the part loads
     * (the layout's, for a page whose code loads).
     */
    announce?: boolean;
    children?: JSX.Element;
}) {
    const { t } = useI18n();
    const loading = () => props.when;
    return (
        <SkeletonContext.Provider value={loading}>
            <Show when={props.announce !== false}>
                {/* Stays on the page; only its text changes. */}
                <p class="visually-hidden" role="status">
                    {loading() ? t('ui.loading', 'Loading…') : ''}
                </p>
            </Show>
            <div
                class="skeleton-scope"
                aria-hidden={loading() ? 'true' : undefined}
                inert={loading()}
            >
                {props.children}
            </div>
        </SkeletonContext.Provider>
    );
}

/**
 * Grey bars in place of text that has not come yet: one for each line, of
 * the line height of the text around them. Under `prefers-reduced-motion`
 * they are still; otherwise they pulse.
 */
export function SkeletonText(props: {
    /** The number of lines (1 by default). */
    lines?: number;
    /** The width of the last line (a CSS length, "60%" by default when there are more lines). */
    width?: string;
    class?: string;
}) {
    const lines = () => Math.max(1, props.lines ?? 1);
    return (
        <span
            class={['skeleton-text', props.class].filter(Boolean).join(' ')}
            style={props.width ? { '--skeleton-last': props.width } : undefined}
            classList={{ 'skeleton-text--single': lines() === 1 }}
        >
            <Index each={Array.from({ length: lines() })}>
                {() => <span class="skeleton-line" />}
            </Index>
        </span>
    );
}

/** A grey area in place of a picture: an avatar, a thumbnail. */
export function SkeletonBlock(props: {
    /** A CSS length (2.5rem by default). */
    width?: string;
    /** A CSS length (the width by default: a square). */
    height?: string;
    /** A circle (an avatar). */
    round?: boolean;
    class?: string;
}) {
    return (
        <span
            class={['skeleton-block', props.class].filter(Boolean).join(' ')}
            classList={{ 'skeleton-block--round': props.round }}
            style={{
                width: props.width ?? '2.5rem',
                height: props.height ?? props.width ?? '2.5rem',
            }}
        />
    );
}
