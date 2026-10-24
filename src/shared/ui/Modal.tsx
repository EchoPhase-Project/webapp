import { createEffect, createUniqueId, on, type JSX } from 'solid-js';
import { AiOutlineClose } from 'solid-icons/ai';
import { useI18n } from '@shared/i18n/i18n-context';
import Button from './Button';
import './modal.scss';

type ModalProps = {
    open: boolean;
    title: string;
    onClose: () => void;
    children: JSX.Element;
};

/**
 * A dialog over the page, for a form such as a new API client. The native
 * <dialog>: the rest of the page is inert, focus stays inside, Escape and a
 * click beside it close it, and focus goes back to what opened it.
 */
export default function Modal(props: ModalProps) {
    const i18n = useI18n();
    const titleId = createUniqueId();
    let dialog: HTMLDialogElement | undefined;

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
                    // its first field.
                    dialog
                        .querySelector<HTMLElement>('input, select, textarea')
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
            class="modal"
            aria-labelledby={titleId}
            // Escape: let the owner close it, so its state stays the truth.
            onCancel={(e) => {
                e.preventDefault();
                props.onClose();
            }}
            // A click on the backdrop lands on the dialog element itself.
            onClick={(e) => {
                if (e.target === e.currentTarget) props.onClose();
            }}
        >
            <div class="modal-body">
                <header class="modal-header">
                    <h2 id={titleId}>{props.title}</h2>
                    <Button
                        variant="icon"
                        aria-label={i18n.t('close', 'Close')}
                        onClick={() => props.onClose()}
                    >
                        <AiOutlineClose />
                    </Button>
                </header>
                {props.children}
            </div>
        </dialog>
    );
}
