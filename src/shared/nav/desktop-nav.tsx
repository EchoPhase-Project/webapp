import { For, Show, createSignal, onCleanup, createEffect } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useI18n } from '@shared/i18n/i18n-context';
import type { NavLink, NavSubItem } from './nav-link';
import './navbar.scss';

// ─── SubMenuItem ──────────────────────────────────────────────────────────────

function DesktopSubMenuItem(props: { item: NavSubItem; onDone: () => void }) {
    const run = (e: MouseEvent | KeyboardEvent) => {
        props.onDone();
        if (e instanceof MouseEvent) props.item.events?.onClick?.(e as never);
        else props.item.events?.onKeyDown?.(e as never);
    };

    return (
        <li role="none">
            <div
                class="nav-submenu-item"
                role="menuitem"
                tabIndex={0}
                aria-label={props.item.label}
                onClick={run}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        run(e);
                    }
                }}
            >
                <Show when={props.item.icon}>
                    <i class="submenu-icon" aria-hidden="true">
                        <Dynamic component={props.item.icon} />
                    </i>
                </Show>
                <div class="submenu-content">
                    <span class="submenu-label">{props.item.label}</span>
                    <Show when={props.item.description}>
                        <span class="submenu-description">
                            {props.item.description}
                        </span>
                    </Show>
                </div>
            </div>
        </li>
    );
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function DesktopNavItem(props: {
    link: NavLink;
    isLogo: boolean;
    open: boolean;
    onToggle: () => void;
    onDone: () => void;
}) {
    const hasItems = () => !!props.link.items?.length;

    const activate = (e: MouseEvent | KeyboardEvent) => {
        if (hasItems()) return props.onToggle();
        props.onDone();
        if (e instanceof MouseEvent) props.link.events?.onClick?.(e as never);
        else props.link.events?.onKeyDown?.(e as never);
    };

    return (
        <li
            class={props.isLogo ? 'logo' : 'nav-item'}
            data-has-items={hasItems() || undefined}
            data-open={props.open || undefined}
        >
            <div
                class="nav-link"
                role="button"
                tabIndex={0}
                aria-label={props.link.text}
                aria-expanded={hasItems() ? props.open : undefined}
                aria-haspopup={hasItems() ? 'menu' : undefined}
                onClick={activate}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        activate(e);
                    }
                }}
            >
                <i class="nav-icon">
                    <props.link.icon />
                </i>
                <span class="link-text">{props.link.text}</span>
                <Show when={hasItems()}>
                    <BurgerLines class="nav-item-burger" open={props.open} />
                </Show>
            </div>

            <Show when={hasItems() && props.open}>
                <ul
                    class="nav-submenu"
                    role="menu"
                    aria-label={props.link.text}
                >
                    <For each={props.link.items}>
                        {(item) => (
                            <DesktopSubMenuItem
                                item={item}
                                onDone={props.onDone}
                            />
                        )}
                    </For>
                </ul>
            </Show>
        </li>
    );
}

// ─── BurgerLines ──────────────────────────────────────────────────────────────

/**
 * Three lines that fold into a cross while open: they meet in the middle,
 * then turn; closing, they turn back, then spread.
 */
function BurgerLines(props: { open: boolean; class?: string }) {
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

// ─── DesktopNav ───────────────────────────────────────────────────────────────

/**
 * The sidebar on desktop (≥768px), after Codewars: a rail of icons that
 * widens while hovered (or while the keyboard is in it) to show the labels.
 * A sub-menu opens against the panel's edge, one at a time, and closes with
 * the panel: when the pointer leaves it, on Escape, a click elsewhere, or
 * once a link is followed.
 */
export function DesktopNav(props: { links: NavLink[] }) {
    const { t } = useI18n();
    // The open sub-menu: its link's text (stable across re-renders).
    const [openItem, setOpenItem] = createSignal<string | null>(null);
    let nav: HTMLElement | undefined;

    const close = () => setOpenItem(null);

    const onDocumentClick = (e: MouseEvent) => {
        if (nav && !nav.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') close();
    };

    // Listen for outside clicks and Escape only while a sub-menu is open.
    createEffect(() => {
        if (openItem()) {
            document.addEventListener('click', onDocumentClick);
            document.addEventListener('keydown', onKeyDown);
        } else {
            document.removeEventListener('click', onDocumentClick);
            document.removeEventListener('keydown', onKeyDown);
        }
    });
    onCleanup(() => {
        document.removeEventListener('click', onDocumentClick);
        document.removeEventListener('keydown', onKeyDown);
    });

    return (
        <nav
            ref={nav}
            class="navbar navbar--desktop"
            aria-label={t('nav.label', 'Main navigation')}
            onMouseLeave={close}
            onFocusOut={(e) => {
                if (!nav?.contains(e.relatedTarget as Node | null)) close();
            }}
        >
            <ul class="navbar-nav">
                <For each={props.links}>
                    {(link, index) => (
                        <DesktopNavItem
                            link={link}
                            isLogo={index() === 0}
                            open={openItem() === link.text}
                            onToggle={() =>
                                setOpenItem((current) =>
                                    current === link.text ? null : link.text
                                )
                            }
                            onDone={close}
                        />
                    )}
                </For>
            </ul>
        </nav>
    );
}
