import { createUniqueId, type JSX } from 'solid-js';

/** A part of a playground page: one component or one family, under an h2. */
export function DevSection(props: {
    title: string;
    /** A line on what to try. */
    note?: JSX.Element;
    children: JSX.Element;
}) {
    const id = createUniqueId();
    return (
        <section class="dev-section" aria-labelledby={id}>
            <h2 id={id}>{props.title}</h2>
            {props.note && <p class="muted">{props.note}</p>}
            {props.children}
        </section>
    );
}

/** Samples side by side, as many columns as fit (one on a phone). */
export function DevGrid(props: { wide?: boolean; children: JSX.Element }) {
    return (
        <div class="dev-grid" classList={{ 'dev-grid--wide': props.wide }}>
            {props.children}
        </div>
    );
}

/** One variant or state, on a card with its name. */
export function DevSample(props: { title: string; children: JSX.Element }) {
    return (
        <div class="card dev-sample">
            <h3 class="dev-sample-title">{props.title}</h3>
            {props.children}
        </div>
    );
}

/** What the last action did, in a live region that stays on the page. */
export function DevLog(props: { children: JSX.Element }) {
    return (
        <p class="muted dev-log" role="status">
            {props.children}
        </p>
    );
}
