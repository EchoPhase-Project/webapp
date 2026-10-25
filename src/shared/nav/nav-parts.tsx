import { Show, type JSX } from 'solid-js';
import { A } from '@solidjs/router';
import { Dynamic } from 'solid-js/web';
import type { NavItem } from './nav-link';

/**
 * One destination of the navigation: a page as a real link (middle-click,
 * "open in new tab", the current one marked by the router) or an action as
 * a button. `onDone` closes whatever menu it is in.
 */
export function NavEntry(props: {
    item: NavItem;
    class: string;
    onDone?: () => void;
    children: JSX.Element;
}) {
    return (
        <Show
            when={props.item.href}
            fallback={
                <button
                    type="button"
                    class={props.class}
                    onClick={() => {
                        props.onDone?.();
                        props.item.onSelect?.();
                    }}
                >
                    {props.children}
                </button>
            }
        >
            {(href) => (
                <A
                    href={href()}
                    end={href() === '/'}
                    class={props.class}
                    activeClass="nav-current"
                    onClick={() => props.onDone?.()}
                >
                    {props.children}
                </A>
            )}
        </Show>
    );
}

/** An item of a group's list: its icon, label and the line under it. */
export function NavItemContent(props: { item: NavItem }) {
    return (
        <>
            <Show when={props.item.icon}>
                <i class="submenu-icon" aria-hidden="true">
                    <Dynamic component={props.item.icon} />
                </i>
            </Show>
            <span class="submenu-content">
                <span class="submenu-label">{props.item.label}</span>
                <Show when={props.item.description}>
                    <span class="submenu-description">
                        {props.item.description}
                    </span>
                </Show>
            </span>
        </>
    );
}

/**
 * Three lines that fold into a cross while open: they meet in the middle,
 * then turn; closing, they turn back, then spread.
 */
export function BurgerLines(props: { open: boolean; class?: string }) {
    return (
        <span
            class={['burger-lines', props.class].filter(Boolean).join(' ')}
            classList={{ 'burger-lines--open': props.open }}
            aria-hidden="true"
        >
            <span />
            <span />
            <span />
        </span>
    );
}
