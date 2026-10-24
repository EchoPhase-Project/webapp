import { splitProps, type JSX } from 'solid-js';

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
    /**
     * primary: the gold main action; ghost: a quiet secondary one; icon: a
     * secondary icon action that turns red on hover (delete, revoke).
     */
    variant?: 'primary' | 'ghost' | 'icon';
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
