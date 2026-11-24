import { createSignal, createUniqueId, For, Show, type JSX } from 'solid-js';
import { useLocation } from '@solidjs/router';
import { useI18n } from '@shared/i18n/i18n-context';
import Avatar from '@shared/ui/Avatar';
import Popover from '@shared/ui/Popover';
import type { NavItem, NavModel, NavSection } from './nav-link';
import NavScroll from './nav-scroll';
import {
    BurgerLines,
    holdsCurrent,
    NavEntry,
    NavItemContent,
} from './nav-parts';
import './navbar.scss';

/** The space between the sidebar and a flyout, and from the window's edge. */
const GAP = 8;
/** A flyout starts this much above its button: its first item is level with it. */
const LIFT = -6;

/**
 * A group's (or the account's) list, beside the sidebar level with its
 * button: a Popover in the top layer, so the scrolling middle does not clip
 * it, moved up when it would run past the bottom of the window (the
 * account's, at the bottom). A press outside it and Escape close it.
 */
function Flyout(props: {
    id: string;
    label: string;
    open: boolean;
    onClose: () => void;
    anchor: () => HTMLElement | undefined;
    items: NavItem[];
    onDone: () => void;
    header?: JSX.Element;
}) {
    return (
        <Popover
            open={props.open}
            onClose={() => props.onClose()}
            anchor={props.anchor}
            box={() => props.anchor()?.closest('nav') ?? undefined}
            side="right"
            gap={GAP}
            offset={LIFT}
            id={props.id}
            class="nav-flyout"
        >
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
        </Popover>
    );
}

/** A section with a list: a button that opens its flyout. */
function GroupButton(props: {
    section: NavSection;
    open: boolean;
    /** One of its pages is the current one: marked like a current link. */
    current?: boolean;
    onToggle: () => void;
    /** The flyout closed by itself (a press outside, Escape). */
    onClose: () => void;
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
                class={['nav-link', props.class, props.current && 'nav-current']
                    .filter(Boolean)
                    .join(' ')}
                aria-expanded={props.open}
                aria-controls={props.open ? id : undefined}
                onClick={() => props.onToggle()}
            >
                {props.content}
                <BurgerLines class="nav-item-burger" open={props.open} />
            </button>
            <Flyout
                id={id}
                label={props.section.label}
                open={props.open}
                onClose={() => props.onClose()}
                anchor={() => button}
                items={props.section.items ?? []}
                onDone={props.onDone}
                header={props.header}
            />
        </>
    );
}

function SectionContent(props: { section: NavSection }) {
    return (
        <>
            <i class="nav-icon">
                <props.section.icon />
            </i>
            <span class="link-text">{props.section.label}</span>
        </>
    );
}

/**
 * The sidebar on desktop (≥768px), after Codewars: a rail of icons that
 * widens while hovered (or while the keyboard is in it) to show the labels.
 * It starts under the app's bar, which holds home (the logo) in its corner,
 * so the model's `home` is not drawn here. Two parts: the sections
 * (scrolling when they do not fit), the account or signing in at the bottom. A list opens beside
 * the rail, one at a time, and closes when the pointer leaves, on Escape, a
 * press elsewhere, a scroll of the middle, or once a link is followed. It
 * follows the rail when the window changes size.
 */
export function DesktopNav(props: { nav: NavModel }) {
    const { t } = useI18n();
    const location = useLocation();
    // The open list: its section's label ("account" for the account's).
    const [open, setOpen] = createSignal<string | null>(null);
    let nav: HTMLElement | undefined;

    const close = () => setOpen(null);
    const toggle = (key: string) =>
        setOpen((current) => (current === key ? null : key));

    // A flyout that closed by itself closes only its own list: another
    // group's may have opened with the same press.
    const closeOnly = (key: string) =>
        setOpen((current) => (current === key ? null : current));

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
                                        current={holdsCurrent(
                                            section.items,
                                            location.pathname
                                        )}
                                        onToggle={() => toggle(section.label)}
                                        onClose={() => closeOnly(section.label)}
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
                <Show when={props.nav.account}>
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
                                current={holdsCurrent(
                                    account().items,
                                    location.pathname
                                )}
                                onToggle={() => toggle(ACCOUNT)}
                                onClose={() => closeOnly(ACCOUNT)}
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
