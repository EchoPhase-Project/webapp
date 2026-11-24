import { Show, splitProps, type ComponentProps } from 'solid-js';
import { A } from '@solidjs/router';
import { useI18n } from '@shared/i18n/i18n-context';
import { IconArrowUpRight } from '@shared/ui/icons';
import { buttonClass, type ButtonVariant } from './button-class';

type LinkButtonProps = ComponentProps<typeof A> & {
    /** The look (button-class.ts); primary by default. */
    variant?: ButtonVariant;
};

/** Another site: an address with its own origin. */
const isExternal = (href: string) => /^[a-z][a-z\d+.-]*:\/\//i.test(href);

/**
 * A link drawn as a Button: a move to another page ("Get started"), a
 * download (`download`) or another site (`target`). The router's <A>, so a
 * page of the app opens without a reload. It has no `disabled` and no
 * `busy`: a link that cannot be followed is not shown.
 *
 * A link to another site ends with an arrow (↗), as on most sites, so it
 * reads as leaving the app before it is followed; it opens without access
 * to this page (`rel`). In a new tab, screen readers hear that too.
 */
export default function LinkButton(props: LinkButtonProps) {
    const { t } = useI18n();
    const [own, rest] = splitProps(props, ['variant', 'class', 'children']);
    const external = () => isExternal(props.href);
    return (
        <A
            class={buttonClass(own.variant, own.class)}
            rel={external() ? 'noopener noreferrer' : undefined}
            {...rest}
        >
            {own.children}
            <Show when={external()}>
                <IconArrowUpRight class="btn-external" />
            </Show>
            <Show when={props.target === '_blank'}>
                {/* The space outside: a name joins the parts as they are. */}{' '}
                <span class="visually-hidden">
                    {t('ui.new_tab', '(opens in a new tab)')}
                </span>
            </Show>
        </A>
    );
}
