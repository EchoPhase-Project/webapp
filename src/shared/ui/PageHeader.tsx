import { Show, type JSX } from 'solid-js';
import './page-header.scss';

type PageHeaderProps = {
    /** Where the page sits, above the title in small accent capitals. */
    eyebrow?: JSX.Element;
    title: JSX.Element;
    /** What the page is for, in a sentence or two. */
    description?: JSX.Element;
    /** A line of small print under it (a date, a count). */
    meta?: JSX.Element;
    /** The page's main action, beside the title. */
    actions?: JSX.Element;
};

/**
 * A page's opening: eyebrow, title and what the page is for, its main action
 * on the right. The same rhythm on every page.
 */
export default function PageHeader(props: PageHeaderProps) {
    return (
        <div class="page-header">
            <div class="page-header-text">
                <Show when={props.eyebrow}>
                    <p class="page-eyebrow">{props.eyebrow}</p>
                </Show>
                <h1>{props.title}</h1>
                <Show when={props.description}>
                    <p class="page-description">{props.description}</p>
                </Show>
                <Show when={props.meta}>
                    <p class="page-meta">{props.meta}</p>
                </Show>
            </div>
            <Show when={props.actions}>
                <div class="page-actions">{props.actions}</div>
            </Show>
        </div>
    );
}
