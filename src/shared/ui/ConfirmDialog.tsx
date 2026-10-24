import type { JSX } from 'solid-js';
import { useI18n } from '@shared/i18n/i18n-context';
import Button from './Button';
import Modal from './Modal';

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    /** What happens, in plain words: what is lost, who notices. */
    children: JSX.Element;
    /** The action's name on its button ("Delete", "Revoke all"). */
    confirm: string;
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

/**
 * Asks before something that cannot be undone. Cancel has the focus, so an
 * Enter by habit does no harm; the action is the red button.
 */
export default function ConfirmDialog(props: ConfirmDialogProps) {
    const i18n = useI18n();
    return (
        <Modal
            open={props.open}
            title={props.title}
            role="alertdialog"
            onClose={props.onCancel}
        >
            <div class="confirm-text">{props.children}</div>
            <div class="confirm-actions">
                <Button
                    variant="ghost"
                    autofocus
                    onClick={() => props.onCancel()}
                >
                    {i18n.t('cancel', 'Cancel')}
                </Button>
                <Button
                    variant="danger"
                    busy={props.busy}
                    onClick={() => props.onConfirm()}
                >
                    {props.confirm}
                </Button>
            </div>
        </Modal>
    );
}
