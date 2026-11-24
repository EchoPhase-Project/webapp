/**
 * primary: the gold main action; ghost: a quiet secondary one; icon: a
 * secondary icon action (copy, show, close); icon-danger: one that removes
 * something and turns red on hover (delete, revoke); ghost-danger: a quiet
 * button that leads to removing something; danger: the confirmed
 * destructive action itself; danger-outline: a button that leads to one (it
 * asks first), red but not loud; link: an action inside a sentence, drawn
 * as a link (a move to another page is a LinkButton or an <A>, not this).
 */
export type ButtonVariant =
    | 'primary'
    | 'ghost'
    | 'icon'
    | 'icon-danger'
    | 'ghost-danger'
    | 'danger'
    | 'danger-outline'
    | 'link';

/** The classes of a button's look: the same for Button and LinkButton. */
export function buttonClass(variant?: ButtonVariant, extra?: string): string {
    return [
        'btn',
        variant && variant !== 'primary' && `btn-${variant}`,
        // The red one is an icon button too.
        variant === 'icon-danger' && 'btn-icon',
        variant === 'ghost-danger' && 'btn-ghost',
        extra,
    ]
        .filter(Boolean)
        .join(' ');
}
