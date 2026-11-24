import { splitProps, type JSX } from 'solid-js';
import { buttonClass, type ButtonVariant } from './button-class';

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
    /** The look (button-class.ts); primary by default. */
    variant?: ButtonVariant;
    /** Working: disabled, and announced as busy. */
    busy?: boolean;
};

/**
 * A button in the app's style; type "button" unless told otherwise. A move
 * to another page or a download is a LinkButton: the same look, a link.
 */
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
            class={buttonClass(own.variant, own.class)}
            disabled={own.disabled || own.busy}
            aria-busy={own.busy || undefined}
            {...rest}
        />
    );
}
