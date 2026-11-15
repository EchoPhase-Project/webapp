import { For, Show, type JSX } from 'solid-js';
import { A } from '@solidjs/router';
import './tabs.scss';

type TabsProps<T extends string> = {
    /** The base of the tabs' and the panel's ids (see tabPanelProps). */
    id: string;
    /** What the tabs switch (e.g. "Text"): the tab list's name. */
    label: string;
    /** Before the tabs, as a field's label; otherwise for screen readers only. */
    showLabel?: boolean;
    value: T;
    onChange: (value: T) => void;
    tabs: readonly { value: T; label: string }[];
    /** After the tabs, on their line (a hint such as "Markdown works"). */
    aside?: JSX.Element;
};

const tabId = (id: string, value: string) => `${id}-tab-${value}`;
const panelId = (id: string) => `${id}-panel`;

/**
 * What the owner spreads on the element under the tabs that shows the
 * selected one: its id, role and name (the selected tab).
 */
export function tabPanelProps(id: string, value: string) {
    return {
        id: panelId(id),
        role: 'tabpanel',
        'aria-labelledby': tabId(id, value),
    } as const;
}

/**
 * A line of tabs over one panel, as WAI-ARIA's tabs pattern: only the
 * selected tab is in the Tab order; the arrows, Home and End move to
 * another tab and select it. The panel is the owner's (tabPanelProps).
 */
export default function Tabs<T extends string>(props: TabsProps<T>) {
    const buttons = new Map<T, HTMLButtonElement>();
    const labelId = () => `${props.id}-label`;

    function select(index: number) {
        const count = props.tabs.length;
        const tab = props.tabs[(index + count) % count];
        if (!tab) return;
        props.onChange(tab.value);
        buttons.get(tab.value)?.focus();
    }

    function onKeyDown(e: KeyboardEvent) {
        const at = props.tabs.findIndex((tab) => tab.value === props.value);
        const target = {
            ArrowRight: at + 1,
            ArrowLeft: at - 1,
            Home: 0,
            End: props.tabs.length - 1,
        }[e.key];
        if (target === undefined) return;
        e.preventDefault();
        select(target);
    }

    return (
        <div class="tabs">
            <Show
                when={props.showLabel}
                fallback={
                    <span id={labelId()} class="visually-hidden">
                        {props.label}
                    </span>
                }
            >
                <span id={labelId()} class="field-label tabs-label">
                    {props.label}
                </span>
            </Show>
            <div
                class="tabs-list"
                role="tablist"
                aria-labelledby={labelId()}
                onKeyDown={onKeyDown}
            >
                <For each={props.tabs}>
                    {(tab) => {
                        const selected = () => tab.value === props.value;
                        return (
                            // The tab pattern's own element: not an action
                            // button, so not Button.
                            <button
                                ref={(el) => buttons.set(tab.value, el)}
                                type="button"
                                role="tab"
                                id={tabId(props.id, tab.value)}
                                class="tabs-tab"
                                aria-selected={selected()}
                                aria-controls={panelId(props.id)}
                                tabIndex={selected() ? 0 : -1}
                                onClick={() => props.onChange(tab.value)}
                            >
                                {tab.label}
                            </button>
                        );
                    }}
                </For>
            </div>
            <Show when={props.aside}>
                <span class="tabs-aside">{props.aside}</span>
            </Show>
        </div>
    );
}

/**
 * Tabs that are links (each part of a page has its own address): a named
 * <nav>, the current one marked with aria-current. The Tab key goes
 * through them as through any links; the page under them is the panel.
 */
export function NavTabs<T extends string>(props: {
    /** What the tabs go through (e.g. "Package"): the nav's name. */
    label: string;
    value: T;
    tabs: readonly { value: T; label: string; href: string }[];
}) {
    return (
        <nav class="tabs" aria-label={props.label}>
            <For each={props.tabs}>
                {(tab) => (
                    <A
                        class="tabs-tab"
                        href={tab.href}
                        aria-current={
                            tab.value === props.value ? 'page' : undefined
                        }
                    >
                        {tab.label}
                    </A>
                )}
            </For>
        </nav>
    );
}
