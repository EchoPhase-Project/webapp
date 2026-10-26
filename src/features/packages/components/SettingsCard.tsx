import { Show, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';

/**
 * One part of a settings page, as GitHub's and Vercel's: a title (and a
 * badge), a line on what it is, its content, and a footer with a short
 * hint on the left and its action on the right, always in the same place.
 * With `onSubmit` it is a form and the action submits it. `danger` marks
 * what cannot be undone.
 */
export default function SettingsCard(props: {
    title: JSX.Element;
    badge?: JSX.Element;
    description?: JSX.Element;
    children?: JSX.Element;
    hint?: JSX.Element;
    actions?: JSX.Element;
    danger?: boolean;
    onSubmit?: (e: SubmitEvent) => void;
}) {
    return (
        <Dynamic
            component={props.onSubmit ? 'form' : 'section'}
            class="settings-card"
            classList={{ 'settings-card--danger': props.danger }}
            onSubmit={props.onSubmit}
            noValidate={props.onSubmit ? true : undefined}
        >
            <div class="settings-card-body">
                <div class="settings-card-head">
                    <h2>{props.title}</h2>
                    {props.badge}
                </div>
                <Show when={props.description}>
                    <p class="settings-card-description">{props.description}</p>
                </Show>
                {props.children}
            </div>
            <Show when={props.hint || props.actions}>
                <div class="settings-card-footer">
                    <span class="settings-card-hint">{props.hint}</span>
                    <span class="settings-card-actions">{props.actions}</span>
                </div>
            </Show>
        </Dynamic>
    );
}
