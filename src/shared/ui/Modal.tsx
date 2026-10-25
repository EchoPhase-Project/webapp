import { createEffect, createUniqueId, on, Show, type JSX } from 'solid-js';
import { AiOutlineClose } from 'solid-icons/ai';
import { useI18n } from '@shared/i18n/i18n-context';
import Button from './Button';
import './modal.scss';

type ModalProps = {
    open: boolean;
    title: JSX.Element;
    /** Called to close it (close button, Escape, a click beside it). */
    onClose?: () => void;
    /** false: it stays until the owner closes it (no button, no Escape). */
    dismissible?: boolean;
    /** alertdialog: something that needs an answer or blocks everything. */
    role?: 'dialog' | 'alertdialog';
    /** On the dialog's card, e.g. "patterned". */
    class?: string;
    /** Wider than a form's dialog: for writing (a note). */
    wide?: boolean;
    children: JSX.Element;
};

/**
 * A dialog over the page: a form such as a new API client, a confirmation,
 * the outage screen. The native <dialog>: the rest of the page is inert,
 * focus stays inside and starts on the first field (or what has autofocus),
 * Escape and a click beside it close it when it may be dismissed, and focus
 * goes back to what opened it.
 */
export default function Modal(props: ModalProps) {
    const i18n = useI18n();
    const titleId = createUniqueId();
    let dialog: HTMLDialogElement | undefined;

    const dismissible = () => props.dismissible ?? true;
    const close = () => {
        if (dismissible()) props.onClose?.();
    };

    createEffect(
        on(
            () => props.open,
            (open) => {
                if (!dialog) return;
                if (open && !dialog.open) {
                    // jsdom (tests) has no showModal.
                    if (typeof dialog.showModal === 'function')
                        dialog.showModal();
                    else dialog.setAttribute('open', '');
                    // The dialog would focus its close button; a form wants
                    // its first field, a confirmation its autofocus button.
                    dialog
                        .querySelector<HTMLElement>(
                            '[autofocus], input, select, textarea'
                        )
                        ?.focus();
                } else if (!open && dialog.open) {
                    if (typeof dialog.close === 'function') dialog.close();
                    else dialog.removeAttribute('open');
                }
            }
        )
    );

    return (
        <dialog
            ref={dialog}
            class={props.wide ? 'modal modal-wide' : 'modal'}
            role={props.role ?? 'dialog'}
            aria-labelledby={titleId}
            // Escape: the owner decides, so its state stays the truth.
            onCancel={(e) => {
                e.preventDefault();
                close();
            }}
            // A click on the backdrop lands on the dialog element itself.
            onClick={(e) => {
                if (e.target === e.currentTarget) close();
            }}
        >
            <div class={['modal-body', props.class].filter(Boolean).join(' ')}>
                <header class="modal-header">
                    <h2 id={titleId}>{props.title}</h2>
                    <Show when={dismissible()}>
                        <Button
                            variant="icon"
                            aria-label={i18n.t('close', 'Close')}
                            onClick={close}
                        >
                            <AiOutlineClose />
                        </Button>
                    </Show>
                </header>
                {props.children}
            </div>
        </dialog>
    );
}
