import { createEffect, onCleanup } from 'solid-js';

/**
 * Closes a popup (a menu, a list) on a click outside `ref` and on Escape,
 * while `isOpen`. Escape is used up there: a dialog around the popup stays
 * open.
 */
export function createDismiss(
    ref: () => HTMLElement | undefined,
    isOpen: () => boolean,
    close: () => void
) {
    const onClick = (e: MouseEvent) => {
        const el = ref();
        if (el && !el.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        close();
    };
    createEffect(() => {
        if (!isOpen()) return;
        document.addEventListener('click', onClick);
        document.addEventListener('keydown', onKeyDown);
        onCleanup(() => {
            document.removeEventListener('click', onClick);
            document.removeEventListener('keydown', onKeyDown);
        });
    });
}
