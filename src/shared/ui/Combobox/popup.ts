import { createEffect, createSignal, onCleanup, type Accessor } from 'solid-js';

/**
 * Where a popup list opens: below its anchor (a button, a field) or above
 * it, when it does not fit below and there is more room above. It looks
 * again on each scroll and resize while `open`; the listeners go when it
 * closes and with the owner. Returns whether the popup opens upwards.
 *
 * Both Combobox modes use it; it knows nothing of the keys or the value.
 */
export function createPopupPlacement(
    anchor: () => HTMLElement | undefined,
    popup: () => HTMLElement | undefined,
    open: Accessor<boolean>
): Accessor<boolean> {
    const [up, setUp] = createSignal(false);

    function place() {
        const a = anchor();
        const p = popup();
        if (!a || !p) return;
        const box = a.getBoundingClientRect();
        const height = p.getBoundingClientRect().height;
        const below = window.innerHeight - box.bottom;
        const above = box.top;
        setUp(height > below && above > below);
    }

    // The effect runs after the popup is in the document, so it can be
    // measured at once.
    createEffect(() => {
        if (!open()) {
            setUp(false);
            return;
        }
        place();
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        onCleanup(() => {
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        });
    });

    return up;
}
