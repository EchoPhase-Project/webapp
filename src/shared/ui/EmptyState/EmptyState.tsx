import type { JSX } from 'solid-js';
import './empty-state.scss';

/** What shows where a list has nothing yet: a short line, maybe an action. */
export default function EmptyState(props: {
    children: JSX.Element;
    action?: JSX.Element;
}) {
    return (
        <div class="empty-state card patterned">
            <p class="muted">{props.children}</p>
            {props.action}
        </div>
    );
}
