import { splitProps, type JSX } from 'solid-js';

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
    /**
     * primary: the gold main action; ghost: a quiet secondary one; icon: a
     * secondary icon action (copy, show, close); icon-danger: one that
     * removes something and turns red on hover (delete, revoke);
     * ghost-danger: a quiet button that leads to removing something;
     * danger: the confirmed destructive action itself; danger-outline: a
     * button that leads to one (it asks first), red but not loud.
     */
    variant?:
        | 'primary'
        | 'ghost'
        | 'icon'
        | 'icon-danger'
        | 'ghost-danger'
        | 'danger'
        | 'danger-outline';
    /** Working: disabled, and announced as busy. */
    busy?: boolean;
};

/** A button in the app's style; type "button" unless told otherwise. */
export default function Button(props: ButtonProps) {
    const [own, rest] = splitProps(props, [
        'variant',
        'busy',
        'class',
        'type',
        'disabled',
    ]);
    return (
        <button
            type={own.type ?? 'button'}
            class={[
                'btn',
                own.variant &&
                    own.variant !== 'primary' &&
                    `btn-${own.variant}`,
                // The red one is an icon button too.
                own.variant === 'icon-danger' && 'btn-icon',
                own.variant === 'ghost-danger' && 'btn-ghost',
                own.class,
            ]
                .filter(Boolean)
                .join(' ')}
            disabled={own.disabled || own.busy}
            aria-busy={own.busy || undefined}
            {...rest}
        />
    );
}
