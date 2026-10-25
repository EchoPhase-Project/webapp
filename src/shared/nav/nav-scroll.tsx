import { createSignal, onCleanup, onMount, type JSX } from 'solid-js';
import { AiOutlineDown, AiOutlineUp } from 'solid-icons/ai';

/**
 * The middle of the navigation: scrolls when its sections do not fit, its
 * scrollbar hidden. An arrow with a soft shadow at the top or bottom shows
 * there is more that way (only then), and steps there when clicked. Keyboard
 * users never need the arrows: focusing an item scrolls it into view.
 */
export default function NavScroll(props: {
    children: JSX.Element;
    class?: string;
    /** Called when the content scrolls (an open flyout closes). */
    onScroll?: () => void;
}) {
    let box: HTMLDivElement | undefined;
    let top: HTMLSpanElement | undefined;
    let bottom: HTMLSpanElement | undefined;
    const [moreUp, setMoreUp] = createSignal(false);
    const [moreDown, setMoreDown] = createSignal(false);

    onMount(() => {
        // jsdom (tests) has no IntersectionObserver: no arrows there.
        if (
            !box ||
            !top ||
            !bottom ||
            typeof IntersectionObserver === 'undefined'
        )
            return;
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.target === top) setMoreUp(!entry.isIntersecting);
                    if (entry.target === bottom)
                        setMoreDown(!entry.isIntersecting);
                }
            },
            { root: box }
        );
        observer.observe(top);
        observer.observe(bottom);
        onCleanup(() => observer.disconnect());
    });

    const step = (direction: 1 | -1) => {
        if (!box) return;
        const reduce = window.matchMedia?.(
            '(prefers-reduced-motion: reduce)'
        ).matches;
        box.scrollBy({
            top: direction * box.clientHeight * 0.6,
            behavior: reduce ? 'auto' : 'smooth',
        });
    };

    return (
        <div class={['nav-scroll-wrap', props.class].filter(Boolean).join(' ')}>
            <button
                type="button"
                class="nav-scroll-arrow nav-scroll-arrow--up"
                classList={{ 'nav-scroll-arrow--shown': moreUp() }}
                tabIndex={-1}
                aria-hidden="true"
                onClick={() => step(-1)}
            >
                <AiOutlineUp />
            </button>
            <div
                class="nav-scroll"
                ref={box}
                onScroll={() => props.onScroll?.()}
            >
                <span class="nav-scroll-sentinel" ref={top} />
                {props.children}
                <span class="nav-scroll-sentinel" ref={bottom} />
            </div>
            <button
                type="button"
                class="nav-scroll-arrow nav-scroll-arrow--down"
                classList={{ 'nav-scroll-arrow--shown': moreDown() }}
                tabIndex={-1}
                aria-hidden="true"
                onClick={() => step(1)}
            >
                <AiOutlineDown />
            </button>
        </div>
    );
}
