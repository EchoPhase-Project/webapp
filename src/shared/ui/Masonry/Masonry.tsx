import { For, onCleanup, onMount, type JSX } from 'solid-js';
import './masonry.scss';

/** The grid's row unit; a card spans as many as its height needs. */
const ROW = 4;
/** The space between cards, both ways (matches masonry.scss). */
const GAP = 14;

/**
 * Cards of different heights packed without gaps, as many columns as fit,
 * in reading order: left to right, then down (so a ranked list reads in
 * rank, and Tab follows it). A CSS grid whose items each span the rows
 * their measured height needs, measured again whenever it changes.
 */
export default function Masonry<T>(props: {
    each: readonly T[];
    children: (item: T, index: () => number) => JSX.Element;
    class?: string;
}) {
    return (
        <div class={['masonry', props.class].filter(Boolean).join(' ')}>
            <For each={props.each}>
                {(item, index) => (
                    <MasonryItem>{props.children(item, index)}</MasonryItem>
                )}
            </For>
        </div>
    );
}

function MasonryItem(props: { children: JSX.Element }) {
    let el: HTMLDivElement | undefined;

    onMount(() => {
        const item = el;
        if (!item) return;
        const span = () => {
            const content = item.firstElementChild as HTMLElement | null;
            const height = (content ?? item).getBoundingClientRect().height;
            item.style.gridRowEnd = `span ${Math.max(1, Math.ceil((height + GAP) / ROW))}`;
        };
        span();
        // jsdom (tests) has no ResizeObserver: one measure is all it gets.
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(span);
        observer.observe(item.firstElementChild ?? item);
        onCleanup(() => observer.disconnect());
    });

    return (
        <div ref={el} class="masonry-item">
            {props.children}
        </div>
    );
}
