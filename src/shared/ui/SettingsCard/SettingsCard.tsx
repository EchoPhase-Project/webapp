import { Show, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import {
    SkeletonText,
    useSkeleton,
    type SkeletonProps,
} from '@shared/ui/Skeleton';
import './settings-card.scss';

/**
 * One part of a settings page, as GitHub's and Vercel's: a title (and a
 * badge), a line on what it is, its content, and a footer with a short
 * hint on the left and its action on the right, always in the same place.
 * With `onSubmit` it is a form and the action submits it. `danger` marks
 * what cannot be undone.
 *
 * Its loading form (in a `SkeletonScope` that loads) keeps the frame, the
 * title and the hint, shows bars in place of an empty title, the
 * description and the content, and keeps the room of the actions without
 * showing them.
 */
export default function SettingsCard(
    props: {
        title: JSX.Element;
        badge?: JSX.Element;
        description?: JSX.Element;
        children?: JSX.Element;
        hint?: JSX.Element;
        actions?: JSX.Element;
        danger?: boolean;
        onSubmit?: (e: SubmitEvent) => void;
    } & SkeletonProps
) {
    const loading = useSkeleton(props);
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
                    <h2>
                        {props.title ||
                            (loading() && <SkeletonText width="10em" />)}
                    </h2>
                    <Show when={!loading()}>{props.badge}</Show>
                </div>
                <Show
                    when={!loading()}
                    fallback={
                        <>
                            <p class="settings-card-description">
                                <SkeletonText width="70%" />
                            </p>
                            <SkeletonText lines={3} />
                        </>
                    }
                >
                    <Show when={props.description}>
                        <p class="settings-card-description">
                            {props.description}
                        </p>
                    </Show>
                    {props.children}
                </Show>
            </div>
            <Show when={props.hint || props.actions}>
                <div class="settings-card-footer">
                    <span class="settings-card-hint">{props.hint}</span>
                    <span
                        class="settings-card-actions"
                        classList={{
                            'settings-card-actions--loading': loading(),
                        }}
                    >
                        {props.actions}
                    </span>
                </div>
            </Show>
        </Dynamic>
    );
}
