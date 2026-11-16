import { Show, type JSX } from 'solid-js';
import { createPopover, type PopoverMode } from './create-popover';
import type { PopoverAlign, PopoverSide } from './placement';
import './popover.scss';

export * from './create-popover';
export * from './placement';

type ElementRef = HTMLElement | (() => HTMLElement | undefined) | undefined;

const resolve = (ref: ElementRef) => (typeof ref === 'function' ? ref() : ref);

export type PopoverProps = {
    open: boolean;
    /** Runs when the panel closed by itself (light dismiss); set `open` false. */
    onClose: () => void;
    /** The element the panel opens next to, usually its trigger. */
    anchor: ElementRef;
    /**
     * "auto" (the default): a press outside, Escape, and another auto panel
     * close it. "manual": only `open` closes it.
     */
    mode?: PopoverMode;
    /** Under the anchor (the default) or to its right. */
    side?: PopoverSide;
    /** Which edge of the anchor the panel lines up with (default start). */
    align?: PopoverAlign;
    /** The space between the anchor and the panel, in pixels. */
    gap?: number;
    /** A shift along the anchor's edge, in pixels: to the right or down. */
    offset?: number;
    /** Side "right": the panel opens from this element's right edge (e.g. a side rail). */
    box?: ElementRef;
    /** The panel's id, for the trigger's aria-controls. */
    id?: string;
    /** Added to the panel, which gets its look from it. */
    class?: string;
    role?: JSX.HTMLAttributes<HTMLDivElement>['role'];
    /** The panel's accessible name, when no visible element names it. */
    label?: string;
    /** The id of a visible element that names the panel. */
    labelledBy?: string;
    children: JSX.Element;
};

/**
 * A non-modal panel (a menu, a list, the notifications) next to its anchor,
 * in the browser's top layer while `open` (createPopover). The trigger stays
 * the caller's: it toggles `open` and says so with aria-expanded and
 * aria-controls. The panel has no look and no text of its own. A modal
 * opens with Modal instead.
 */
export default function Popover(props: PopoverProps) {
    let panel: HTMLDivElement | undefined;

    createPopover({
        panel: () => panel,
        anchor: () => resolve(props.anchor),
        open: () => props.open,
        onClose: () => props.onClose(),
        mode: () => props.mode ?? 'auto',
        placement: () => ({
            side: props.side,
            align: props.align,
            gap: props.gap,
            offset: props.offset,
            box: resolve(props.box),
        }),
    });

    return (
        <Show when={props.open}>
            <div
                ref={panel}
                id={props.id}
                class={props.class ? `popover ${props.class}` : 'popover'}
                role={props.role}
                aria-label={props.label}
                aria-labelledby={props.labelledBy}
            >
                {props.children}
            </div>
        </Show>
    );
}
