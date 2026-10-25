import {
    createEffect,
    createSignal,
    createUniqueId,
    For,
    onCleanup,
    onMount,
    Show,
    type JSX,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useI18n } from '@shared/i18n/i18n-context';
import Avatar from '@shared/ui/Avatar';
import type { NavItem, NavModel, NavSection } from './nav-link';
import NavScroll from './nav-scroll';
import { BurgerLines, NavEntry, NavItemContent } from './nav-parts';
import './navbar.scss';

/** The space between the sidebar and a flyout, and from the window's edge. */
const GAP = 8;

/**
 * A group's (or the account's) list, beside the sidebar level with its
 * button. Fixed, so the scrolling middle does not clip it; moved up when it
 * would run past the bottom of the window (the account's, at the bottom).
 */
function Flyout(props: {
    id: string;
    label: string;
    anchor: HTMLElement;
    items: NavItem[];
    onDone: () => void;
    header?: JSX.Element;
}) {
    let list: HTMLDivElement | undefined;
    const [style, setStyle] = createSignal<JSX.CSSProperties>({
        visibility: 'hidden',
    });

    onMount(() => {
        const nav = props.anchor.closest('nav')?.getBoundingClientRect();
        const at = props.anchor.getBoundingClientRect();
        const height = list?.offsetHeight ?? 0;
        const top = Math.max(
            GAP,
            Math.min(at.top - 6, window.innerHeight - GAP - height)
        );
        setStyle({
            top: `${top}px`,
            left: `${(nav?.right ?? at.right) + GAP}px`,
        });
    });

    return (
        <div ref={list} id={props.id} class="nav-flyout" style={style()}>
            {props.header}
            <ul class="nav-flyout-list" aria-label={props.label}>
                <For each={props.items}>
                    {(item) => (
                        <li>
                            <NavEntry
                                item={item}
                                class="nav-flyout-item"
                                onDone={props.onDone}
                            >
                                <NavItemContent item={item} />
                            </NavEntry>
                        </li>
                    )}
                </For>
            </ul>
        </div>
    );
}

/** A section with a list: a button that opens its flyout. */
function GroupButton(props: {
    section: NavSection;
    open: boolean;
    onToggle: () => void;
    onDone: () => void;
    class?: string;
    content: JSX.Element;
    header?: JSX.Element;
}) {
    const id = createUniqueId();
    let button: HTMLButtonElement | undefined;
    return (
        <>
            <button
                ref={button}
                type="button"
                class={['nav-link', props.class].filter(Boolean).join(' ')}
                aria-expanded={props.open}
                aria-controls={props.open ? id : undefined}
                onClick={() => props.onToggle()}
            >
                {props.content}
                <BurgerLines class="nav-item-burger" open={props.open} />
            </button>
            <Show when={props.open && button}>
                {(anchor) => (
                    <Flyout
                        id={id}
                        label={props.section.label}
                        anchor={anchor()}
                        items={props.section.items ?? []}
                        onDone={props.onDone}
                        header={props.header}
                    />
                )}
            </Show>
        </>
    );
}

function SectionContent(props: { section: NavSection }) {
    return (
        <>
            <i class="nav-icon" aria-hidden="true">
                <props.section.icon />
            </i>
            <span class="link-text">{props.section.label}</span>
        </>
    );
}

/**
 * The sidebar on desktop (≥768px), after Codewars: a rail of icons that
 * widens while hovered (or while the keyboard is in it) to show the labels.
 * Three parts: home on top, the sections in the middle (scrolling when they
 * do not fit), the account or signing in at the bottom. A list opens beside
 * the rail, one at a time, and closes when the pointer leaves, on Escape, a
 * click elsewhere, a scroll of the middle, or once a link is followed.
 */
export function DesktopNav(props: { nav: NavModel }) {
    const { t } = useI18n();
    // The open list: its section's label ("account" for the account's).
    const [open, setOpen] = createSignal<string | null>(null);
    let nav: HTMLElement | undefined;

    const close = () => setOpen(null);
    const toggle = (key: string) =>
        setOpen((current) => (current === key ? null : key));

    const onDocumentClick = (e: MouseEvent) => {
        if (nav && !nav.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') close();
    };
    createEffect(() => {
        if (open()) {
            document.addEventListener('click', onDocumentClick);
            document.addEventListener('keydown', onKeyDown);
            window.addEventListener('resize', close);
        } else {
            document.removeEventListener('click', onDocumentClick);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', close);
        }
    });
    onCleanup(() => {
        document.removeEventListener('click', onDocumentClick);
        document.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('resize', close);
    });

    const ACCOUNT = '\u0000account';

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
            <div class="nav-top">
                <NavEntry
                    item={props.nav.home}
                    class="nav-link nav-home"
                    onDone={close}
                >
                    <SectionContent section={props.nav.home} />
                </NavEntry>
            </div>

            <NavScroll class="nav-middle" onScroll={close}>
                <ul class="navbar-nav">
                    <For each={props.nav.sections}>
                        {(section) => (
                            <li
                                class="nav-item"
                                data-open={
                                    open() === section.label || undefined
                                }
                            >
                                <Show
                                    when={section.items?.length}
                                    fallback={
                                        <NavEntry
                                            item={section}
                                            class="nav-link"
                                            onDone={close}
                                        >
                                            <SectionContent section={section} />
                                        </NavEntry>
                                    }
                                >
                                    <GroupButton
                                        section={section}
                                        open={open() === section.label}
                                        onToggle={() => toggle(section.label)}
                                        onDone={close}
                                        content={
                                            <SectionContent section={section} />
                                        }
                                    />
                                </Show>
                            </li>
                        )}
                    </For>
                </ul>
            </NavScroll>

            <div class="nav-bottom">
                <Show
                    when={props.nav.account}
                    fallback={
                        <Show when={props.nav.login}>
                            {(login) => (
                                <NavEntry
                                    item={login()}
                                    class="nav-link"
                                    onDone={close}
                                >
                                    <i class="nav-icon" aria-hidden="true">
                                        <Show when={login().icon}>
                                            {(Icon) => (
                                                <Dynamic component={Icon()} />
                                            )}
                                        </Show>
                                    </i>
                                    <span class="link-text">
                                        {login().label}
                                    </span>
                                </NavEntry>
                            )}
                        </Show>
                    }
                >
                    {(account) => (
                        <div
                            class="nav-item"
                            data-open={open() === ACCOUNT || undefined}
                        >
                            <GroupButton
                                section={{
                                    icon: () => null,
                                    label: t('nav.account', 'Account'),
                                    items: account().items,
                                }}
                                class="nav-account"
                                open={open() === ACCOUNT}
                                onToggle={() => toggle(ACCOUNT)}
                                onDone={close}
                                content={
                                    <>
                                        <Avatar
                                            name={account().name}
                                            seed={account().id}
                                            fileId={account().avatarFileId}
                                            size={28}
                                        />
                                        <span class="link-text nav-account-text">
                                            <span class="nav-account-name">
                                                {account().name}
                                            </span>
                                            <Show when={account().userName}>
                                                <span class="nav-account-username">
                                                    @{account().userName}
                                                </span>
                                            </Show>
                                        </span>
                                    </>
                                }
                            />
                        </div>
                    )}
                </Show>
            </div>
        </nav>
    );
}
