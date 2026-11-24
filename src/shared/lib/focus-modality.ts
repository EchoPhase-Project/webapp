/**
 * How the focus came to where it is: "keyboard" (Tab, arrows, Enter) or
 * "pointer" (a click, a tap). Kept on <html> as `data-focus-by`, so a field
 * shows its focus ring only when the keyboard brought the focus there.
 *
 * A text field matches :focus-visible after a click too (the browsers'
 * rule: it takes typing), so CSS alone cannot tell the two apart. The value
 * is taken when the focus moves, not on each key: typing in a field that a
 * click focused does not bring the ring. Focus moved by the code (a form's
 * first error after a submit) follows how that action started.
 *
 * Without the attribute (before this runs) the ring shows: the safe side.
 * Returns the function that stops watching.
 */
export function watchFocusModality(
    root: HTMLElement = document.documentElement
) {
    let by: 'keyboard' | 'pointer' = 'keyboard';
    const onKey = (event: KeyboardEvent) => {
        // A modifier alone (Ctrl, Shift) is no move of the focus.
        if (event.metaKey || event.altKey || event.ctrlKey) return;
        by = 'keyboard';
    };
    const onPointer = () => {
        by = 'pointer';
        // Clicking in the field that already has the focus: no ring either.
        root.dataset.focusBy = by;
    };
    const onFocus = () => {
        root.dataset.focusBy = by;
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('focusin', onFocus, true);
    return () => {
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('pointerdown', onPointer, true);
        document.removeEventListener('focusin', onFocus, true);
        delete root.dataset.focusBy;
    };
}
