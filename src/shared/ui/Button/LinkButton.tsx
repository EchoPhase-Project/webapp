import { splitProps, type ComponentProps } from 'solid-js';
import { A } from '@solidjs/router';
import { buttonClass, type ButtonVariant } from './button-class';

type LinkButtonProps = ComponentProps<typeof A> & {
    /** The look (button-class.ts); primary by default. */
    variant?: ButtonVariant;
};

/**
 * A link drawn as a Button: a move to another page ("Get started"), a
 * download (`download`) or another site (`target`). The router's <A>, so a
 * page of the app opens without a reload. It has no `disabled` and no
 * `busy`: a link that cannot be followed is not shown.
 */
export default function LinkButton(props: LinkButtonProps) {
    const [own, rest] = splitProps(props, ['variant', 'class']);
    return <A class={buttonClass(own.variant, own.class)} {...rest} />;
}
