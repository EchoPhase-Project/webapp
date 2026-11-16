import {
    createEffect,
    createSignal,
    onCleanup,
    untrack,
    type Accessor,
} from 'solid-js';
import {
    followPlacement,
    placePanel,
    type PlacementOptions,
} from './placement';

/**
 * How a popover closes. "auto": the browser closes it on a press outside,
 * on Escape, and when another auto popover opens (light dismiss). "manual":
 * only its owner closes it.
 */
export type PopoverMode = 'auto' | 'manual';

export type PopoverOptions = {
    /** The panel. It is in the document while `open`. */
    panel: () => HTMLElement | undefined;
    /** The element the panel opens next to: its trigger, or a field. */
    anchor: () => HTMLElement | undefined;
    open: Accessor<boolean>;
    /**
     * Runs when the panel closed without its owner: light dismiss, or the
     * fallback's press outside and Escape. The owner then sets `open` false.
     */
    onClose?: () => void;
    mode?: () => PopoverMode;
    placement?: () => PlacementOptions;
    /**
     * Without the Popover API: "fixed" (the default) still gives the panel
     * fixed coordinates; "stylesheet" leaves the placement to the CSS.
     */
    fallback?: 'fixed' | 'stylesheet';
};

export type PopoverState = {
    /** Under the anchor: the panel opened above it, as there was no room below. */
    up: Accessor<boolean>;
    /** The panel is in the browser's top layer now. */
    layered: Accessor<boolean>;
};

// jsdom and old browsers have no Popover API.
const hasPopoverApi = (el: HTMLElement) =>
    typeof el.showPopover === 'function' &&
    typeof el.hidePopover === 'function';

const inside = (el: HTMLElement | undefined, target: EventTarget | null) =>
    !!el && target instanceof Node && el.contains(target);

/**
 * A panel in the browser's top layer, next to its anchor, while `open`: no
 * parent with an overflow clips it, and it shows over the page and over a
 * modal dialog. It stays in its place in the DOM. The attribute `popover`
 * goes on just before showPopover(): a [popover] that does not show is
 * hidden (also in jsdom). Fixed coordinates from the anchor's box place it
 * (placement.ts), again on each scroll and resize.
 *
 * In "auto" mode the browser's light dismiss closes it; the `toggle` event
 * then calls onClose, so the owner's signal follows. A press on the anchor
 * is outside the panel, so the browser closes it there too; the anchor's own
 * click then closes it (it was open), and the close by the press is
 * ignored: the panel does not open again. If no click comes, onClose runs
 * after the press. When Escape closes the panel while the focus is in it,
 * the focus goes back to the anchor.
 *
 * Without the API (or if showPopover fails), "auto" closes on a press
 * outside the panel and the anchor and on Escape by its own listeners.
 */
export function createPopover(options: PopoverOptions): PopoverState {
    const [up, setUp] = createSignal(false);
    const [layered, setLayered] = createSignal(false);
    const close = () => options.onClose?.();

    createEffect(() => {
        if (!options.open()) {
            setUp(false);
            return;
        }
        const panel = options.panel();
        if (!panel) return;
        untrack(() => show(panel));
    });

    function show(panel: HTMLElement) {
        const mode = options.mode?.() ?? 'auto';
        let shown = false;
        if (hasPopoverApi(panel)) {
            try {
                panel.setAttribute('popover', mode);
                panel.showPopover();
                shown = true;
            } catch {
                // Not in the document, or shown already: without the
                // attribute, the stylesheet shows it.
                panel.removeAttribute('popover');
            }
        }
        setLayered(shown);

        const write = shown || options.fallback !== 'stylesheet';
        const place = () => {
            const anchor = options.anchor();
            if (!anchor) return;
            setUp(
                placePanel(anchor, panel, options.placement?.() ?? {}, write).up
            );
        };
        place();
        const stopFollowing = followPlacement(place);

        // False once this panel closed or the owner closed it.
        let alive = true;
        // The current press started on the anchor.
        let anchorPress = false;
        // The browser closed the panel on that press; the click decides.
        let pressClosed = false;
        // Escape was pressed while the focus was in the panel.
        let escapedFromInside = false;

        const returnFocus = () => {
            if (escapedFromInside) options.anchor()?.focus();
            escapedFromInside = false;
        };

        const onPointerDown = (e: PointerEvent) => {
            anchorPress = inside(options.anchor(), e.target);
            escapedFromInside = false;
            if (!shown && mode === 'auto') {
                if (!anchorPress && !inside(panel, e.target)) close();
            }
        };
        // The press ended (its click, or a cancel). If the browser closed
        // the panel on it and the owner did not close it, it closes now.
        const onPressEnd = () => {
            anchorPress = false;
            if (!pressClosed) return;
            pressClosed = false;
            setTimeout(() => {
                if (alive && options.open()) close();
            }, 0);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || e.defaultPrevented) return;
            escapedFromInside = inside(panel, document.activeElement);
            if (!shown && mode === 'auto') {
                e.preventDefault();
                returnFocus();
                close();
            }
        };
        const onToggle = (e: Event) => {
            if ((e as ToggleEvent).newState !== 'closed') return;
            if (!alive || !options.open()) return;
            if (anchorPress) {
                pressClosed = true;
                return;
            }
            returnFocus();
            close();
        };

        if (shown) panel.addEventListener('toggle', onToggle);
        if (mode === 'auto') {
            document.addEventListener('pointerdown', onPointerDown, true);
            document.addEventListener('click', onPressEnd, true);
            document.addEventListener('pointercancel', onPressEnd, true);
            document.addEventListener('keydown', onKeyDown);
        }

        onCleanup(() => {
            alive = false;
            stopFollowing();
            panel.removeEventListener('toggle', onToggle);
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('click', onPressEnd, true);
            document.removeEventListener('pointercancel', onPressEnd, true);
            document.removeEventListener('keydown', onKeyDown);
            setLayered(false);
            if (shown) {
                try {
                    panel.hidePopover();
                } catch {
                    // Hidden already (light dismiss), or out of the document.
                }
            }
        });
    }

    return { up, layered };
}
