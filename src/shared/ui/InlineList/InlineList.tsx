import { children, createMemo, For, Show, type JSX } from 'solid-js';
import './inline-list.scss';

type InlineListProps = {
    /** The parts of the line; empty ones (null, false, '') are left out. */
    items: JSX.Element[];
    class?: string;
};

/**
 * A line of short parts with a dot between them: "Bamako · UTC+0",
 * "by Ann · 12 installs · updated Oct 26". The dot is drawn (a circle
 * centred on the line, the same in every font), hidden from screen readers,
 * which hear a comma instead. It stays at the end of its part's line, so
 * a wrapped line never starts with a dot.
 *
 * Not for a text in one translation: there the dot stays a "·" in the
 * string, so translators get no markup.
 */
export default function InlineList(props: InlineListProps) {
    // Read once: each read of `items` makes its components again. Each
    // part resolved on its own, so a part that renders nothing (a <Show>
    // that is off) is left out too.
    const parts = createMemo(() =>
        props.items
            .map((item) => children(() => item).toArray())
            .filter((nodes) => nodes.some(shown))
    );
    return (
        <span class={`inline-list ${props.class ?? ''}`}>
            <For each={parts()}>
                {(part, i) => (
                    <span class="inline-list-item">
                        <span class="inline-list-text">{part}</span>
                        <Show when={i() < parts().length - 1}>
                            <span class="inline-list-sep" aria-hidden="true" />
                            <span class="visually-hidden">, </span>
                        </Show>
                    </span>
                )}
            </For>
        </span>
    );
}

const shown = (node: unknown) =>
    node !== null && node !== undefined && node !== false && node !== '';
