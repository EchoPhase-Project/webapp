import {
    createEffect,
    createMemo,
    createSignal,
    createUniqueId,
    For,
    on,
    Show,
    type JSX,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useLocation } from '@solidjs/router';
import { AiOutlineClose, AiOutlineDown } from 'solid-icons/ai';
import { IoEllipsisHorizontal } from 'solid-icons/io';
import { useI18n } from '@shared/i18n/i18n-context';
import Avatar from '@shared/ui/Avatar';
import type { NavItem, NavModel, NavSection } from './nav-link';
import NavScroll from './nav-scroll';
import { holdsCurrent, isCurrent, NavEntry, NavItemContent } from './nav-parts';
import './navbar.scss';

/** Destinations on the bar itself; everything is in the drawer behind "More". */
const ON_BAR = 3;

/** How far a swipe to the right goes before the drawer closes, in px. */
const SWIPE_CLOSE = 60;

/** The pages of the model in order, groups opened: what the bar picks from. */
function destinations(nav: NavModel): NavItem[] {
    return [
        nav.home,
        ...nav.sections.flatMap((s): NavItem[] =>
            s.items?.length ? s.items : [s]
        ),
    ];
}

/**
 * A row of the drawer that expands into its pages (an accordion): downward,
 * or upward for the account at the bottom, so its menu opens above it.
 */
function DrawerGroup(props: {
    /** What the row shows: its icon and label. */
    content: JSX.Element;
    items: NavItem[];
    open: boolean;
    onToggle: () => void;
    onDone: () => void;
    upward?: boolean;
    class?: string;
}) {
    const id = createUniqueId();
    const location = useLocation();
    return (
        <li
            class={['drawer-group', props.class].filter(Boolean).join(' ')}
            classList={{ 'drawer-group--up': props.upward }}
        >
            <button
                type="button"
                class="drawer-row"
                classList={{
                    'nav-current': holdsCurrent(props.items, location.pathname),
                }}
                aria-expanded={props.open}
                aria-controls={id}
                onClick={() => props.onToggle()}
            >
                {props.content}
                <AiOutlineDown class="drawer-chevron" aria-hidden="true" />
            </button>
            <ul id={id} class="drawer-sublist" hidden={!props.open}>
                <For each={props.items}>
                    {(item) => (
                        <li>
                            <NavEntry
                                item={item}
                                class="drawer-subrow"
                                onDone={props.onDone}
                            >
                                <NavItemContent item={item} />
                            </NavEntry>
                        </li>
                    )}
                </For>
            </ul>
        </li>
    );
}

function SectionIcon(props: { section: NavSection | NavItem }) {
    return (
        <i class="nav-icon" aria-hidden="true">
            <Show when={props.section.icon}>
                {(Icon) => <Dynamic component={Icon()} />}
            </Show>
        </i>
    );
}

/**
 * The drawer behind "More": the whole navigation, sliding in from the right.
 * Home on top, the sections in the middle (groups expand in place, the
 * current page's open to start with), the account or signing in at the
 * bottom. A modal dialog: the page behind is inert, focus stays inside and
 * returns to "More"; Escape, a tap beside it, a swipe to the right or
 * following a link closes it.
 */
function Drawer(props: { nav: NavModel; open: boolean; onClose: () => void }) {
    const { t } = useI18n();
    const location = useLocation();
    let dialog: HTMLDialogElement | undefined;
    const [expanded, setExpanded] = createSignal<Set<string>>(new Set());

    const ACCOUNT = '\u0000account';
    const toggle = (key: string) =>
        setExpanded((current) => {
            const next = new Set(current);
            if (!next.delete(key)) next.add(key);
            return next;
        });

    // Opening: the group of the current page starts expanded.
    createEffect(
        on(
            () => props.open,
            (open) => {
                if (!dialog) return;
                if (open && !dialog.open) {
                    const here = props.nav.sections.find((s) =>
                        s.items?.some(
                            (i) =>
                                i.href && location.pathname.startsWith(i.href)
                        )
                    );
                    setExpanded(new Set(here ? [here.label] : []));
                    if (typeof dialog.showModal === 'function')
                        dialog.showModal();
                    else dialog.setAttribute('open', '');
                } else if (!open && dialog.open) {
                    if (typeof dialog.close === 'function') dialog.close();
                    else dialog.removeAttribute('open');
                }
            }
        )
    );

    let startX: number | null = null;

    return (
        <dialog
            ref={dialog}
            class="nav-drawer"
            aria-label={t('nav.label', 'Main navigation')}
            onClose={() => props.onClose()}
            onCancel={(e) => {
                e.preventDefault();
                props.onClose();
            }}
            // A tap on the backdrop lands on the dialog itself.
            onClick={(e) => {
                if (e.target === dialog) props.onClose();
            }}
            onTouchStart={(e) => (startX = e.touches[0]?.clientX ?? null)}
            onTouchEnd={(e) => {
                const endX = e.changedTouches[0]?.clientX;
                if (
                    startX !== null &&
                    endX !== undefined &&
                    endX - startX > SWIPE_CLOSE
                )
                    props.onClose();
                startX = null;
            }}
        >
            <div class="drawer-panel">
                <div class="drawer-top">
                    <NavEntry
                        item={props.nav.home}
                        class="drawer-row drawer-home"
                        onDone={props.onClose}
                    >
                        <SectionIcon section={props.nav.home} />
                        <span class="drawer-label">EchoPhase</span>
                    </NavEntry>
                    <button
                        type="button"
                        class="drawer-close"
                        aria-label={t('nav.close', 'Close the menu')}
                        onClick={() => props.onClose()}
                    >
                        <AiOutlineClose />
                    </button>
                </div>

                <NavScroll class="drawer-middle">
                    <ul class="drawer-list">
                        <For each={props.nav.sections}>
                            {(section) => (
                                <Show
                                    when={section.items?.length}
                                    fallback={
                                        <li>
                                            <NavEntry
                                                item={section}
                                                class="drawer-row"
                                                onDone={props.onClose}
                                            >
                                                <SectionIcon
                                                    section={section}
                                                />
                                                <span class="drawer-label">
                                                    {section.label}
                                                </span>
                                            </NavEntry>
                                        </li>
                                    }
                                >
                                    <DrawerGroup
                                        content={
                                            <>
                                                <SectionIcon
                                                    section={section}
                                                />
                                                <span class="drawer-label">
                                                    {section.label}
                                                </span>
                                            </>
                                        }
                                        items={section.items ?? []}
                                        open={expanded().has(section.label)}
                                        onToggle={() => toggle(section.label)}
                                        onDone={props.onClose}
                                    />
                                </Show>
                            )}
                        </For>
                    </ul>
                </NavScroll>

                <div class="drawer-bottom">
                    <Show
                        when={props.nav.account}
                        fallback={
                            <Show when={props.nav.login}>
                                {(login) => (
                                    <ul class="drawer-list">
                                        <li>
                                            <NavEntry
                                                item={login()}
                                                class="drawer-row"
                                                onDone={props.onClose}
                                            >
                                                <SectionIcon
                                                    section={login()}
                                                />
                                                <span class="drawer-label">
                                                    {login().label}
                                                </span>
                                            </NavEntry>
                                        </li>
                                    </ul>
                                )}
                            </Show>
                        }
                    >
                        {(account) => (
                            <ul class="drawer-list">
                                <DrawerGroup
                                    class="drawer-account"
                                    upward
                                    content={
                                        <>
                                            <Avatar
                                                name={account().name}
                                                seed={account().id}
                                                fileId={account().avatarFileId}
                                                size={32}
                                            />
                                            <span class="drawer-label drawer-account-text">
                                                <span>{account().name}</span>
                                                <Show when={account().userName}>
                                                    <span class="drawer-account-username">
                                                        @{account().userName}
                                                    </span>
                                                </Show>
                                            </span>
                                        </>
                                    }
                                    items={account().items}
                                    open={expanded().has(ACCOUNT)}
                                    onToggle={() => toggle(ACCOUNT)}
                                    onDone={props.onClose}
                                />
                            </ul>
                        )}
                    </Show>
                </div>
            </div>
        </dialog>
    );
}

/**
 * Navigation on phones (<768px): a bar at the bottom with the first pages
 * and "More", which slides in the drawer with everything. Signed out there
 * is no bar: the header offers signing in.
 */
export function MobileNav(props: { nav: NavModel }) {
    const { t } = useI18n();
    const location = useLocation();
    const [open, setOpen] = createSignal(false);
    let more: HTMLButtonElement | undefined;
    const bar = createMemo(() => destinations(props.nav).slice(0, ON_BAR));
    // Somewhere only the drawer leads to: "More" shows as current.
    const elsewhere = () =>
        !bar().some((item) => isCurrent(item.href, location.pathname));

    const close = () => {
        setOpen(false);
        more?.focus();
    };

    return (
        <Show when={props.nav.account}>
            <nav
                class="navbar navbar--mobile"
                aria-label={t('nav.label', 'Main navigation')}
            >
                <ul class="mobile-navbar-nav">
                    <For each={bar()}>
                        {(item) => (
                            <li class="mobile-nav-item">
                                <NavEntry item={item} class="mobile-nav-btn">
                                    <SectionIcon section={item} />
                                    <span class="mobile-nav-label">
                                        {item.label}
                                    </span>
                                </NavEntry>
                            </li>
                        )}
                    </For>
                    <li class="mobile-nav-item">
                        <button
                            ref={more}
                            type="button"
                            class="mobile-nav-btn"
                            classList={{ 'nav-current': elsewhere() }}
                            aria-expanded={open()}
                            aria-haspopup="dialog"
                            onClick={() => setOpen(true)}
                        >
                            <i class="nav-icon" aria-hidden="true">
                                <IoEllipsisHorizontal />
                            </i>
                            <span class="mobile-nav-label">
                                {t('nav.more', 'More')}
                            </span>
                        </button>
                    </li>
                </ul>
            </nav>
            <Drawer nav={props.nav} open={open()} onClose={close} />
        </Show>
    );
}
