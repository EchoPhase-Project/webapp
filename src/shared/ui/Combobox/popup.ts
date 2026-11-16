import { createEffect, createSignal, onCleanup, type Accessor } from 'solid-js';

/** Which edge of the anchor the popup lines up with. */
export type PopupAlign = 'start' | 'end';

/** The gap between the anchor and the popup, in pixels. */
const GAP = 4;

// The Popover API puts an element in the top layer. jsdom and old browsers
// lack it; there the popup stays absolute under its anchor (combobox.scss).
const hasPopover = (el: HTMLElement) =>
    typeof el.showPopover === 'function' &&
    typeof el.hidePopover === 'function';

/**
 * Where a popup list opens: below its anchor (a button, a field) or above
 * it, when it does not fit below and there is more room above. It looks
 * again on each scroll and resize while `open`; the listeners go when it
 * closes and with the owner. Returns whether the popup opens upwards.
 *
 * Where the browser has the Popover API, the popup gets popover="manual"
 * and goes into the top layer while open: no parent with an
 * overflow clips it, and it shows over a modal dialog. It stays in its
 * place in the DOM; fixed coordinates from the anchor's box put it next to
 * the anchor, at the anchor's start or end edge (`align`), at least as wide
 * as the anchor (--combobox-anchor-width). Without the API, the stylesheet
 * places it.
 *
 * Both Combobox modes use it; it knows nothing of the keys or the value.
 */
export function createPopupPlacement(
    anchor: () => HTMLElement | undefined,
    popup: () => HTMLElement | undefined,
    open: Accessor<boolean>,
    align: () => PopupAlign = () => 'start'
): Accessor<boolean> {
    const [up, setUp] = createSignal(false);
    // The popup in the top layer now, if any.
    let layered: HTMLElement | undefined;

    function place() {
        const a = anchor();
        const p = popup();
        if (!a || !p) return;
        const box = a.getBoundingClientRect();
        const height = p.getBoundingClientRect().height;
        const below = window.innerHeight - box.bottom;
        const above = box.top;
        const upwards = height > below && above > below;
        setUp(upwards);
        if (p === layered) setCoordinates(p, box, upwards);
    }

    function setCoordinates(p: HTMLElement, box: DOMRect, upwards: boolean) {
        const s = p.style;
        s.position = 'fixed';
        s.top = upwards ? 'auto' : `${box.bottom + GAP}px`;
        s.bottom = upwards ? `${window.innerHeight - box.top + GAP}px` : 'auto';
        if (align() === 'end') {
            // A fixed box's right is from the viewport's edge, without the
            // scroll bar.
            const width =
                document.documentElement.clientWidth || window.innerWidth;
            s.left = 'auto';
            s.right = `${width - box.right}px`;
        } else {
            s.left = `${box.left}px`;
            s.right = 'auto';
        }
        s.setProperty('--combobox-anchor-width', `${box.width}px`);
    }

    // The effect runs after the popup is in the document, so it can be
    // measured at once (in the top layer: after it shows).
    createEffect(() => {
        if (!open()) {
            setUp(false);
            return;
        }
        const p = popup();
        if (p && hasPopover(p)) {
            try {
                // Only here: a [popover] that does not show is hidden.
                p.setAttribute('popover', 'manual');
                p.showPopover();
                layered = p;
            } catch {
                // Not in the document, or shown already: without the
                // attribute, the stylesheet shows and places it.
                p.removeAttribute('popover');
            }
        }
        place();
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        onCleanup(() => {
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
            const shown = layered;
            layered = undefined;
            if (shown && hasPopover(shown)) {
                try {
                    shown.hidePopover();
                } catch {
                    // Out of the document already, so hidden.
                }
            }
        });
    });

    return up;
}
