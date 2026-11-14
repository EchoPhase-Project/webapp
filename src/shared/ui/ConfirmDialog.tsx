import { Show, type JSX } from 'solid-js';
import { useI18n } from '@shared/i18n/i18n-context';
import Button from './Button';
import Modal from './Modal';

type CommonProps = {
    title: string;
    /** The action's name on its button ("Delete", "Revoke all"). */
    confirm: string;
    busy?: boolean;
    onCancel: () => void;
};

/** About one thing, such as the file to delete: open while there is one. */
type ItemProps<T> = CommonProps & {
    item: T | null | undefined;
    open?: never;
    /** What happens to it, in plain words: what is lost, who notices. */
    children: JSX.Element | ((item: T) => JSX.Element);
    onConfirm: (item: T) => void;
};

/** About something the page already knows, such as all sessions. */
type OpenProps = CommonProps & {
    open: boolean;
    item?: never;
    /** What happens, in plain words: what is lost, who notices. */
    children: JSX.Element;
    onConfirm: () => void;
};

/**
 * Asks before something that cannot be undone. Cancel has the focus, so an
 * Enter by habit does no harm; the action is the red button. Given an
 * `item`, it is open while the item is there and hands it to `onConfirm`.
 */
export default function ConfirmDialog<T>(props: ItemProps<T> | OpenProps) {
    const i18n = useI18n();
    const open = () => ('item' in props ? props.item != null : props.open);
    const body = (): JSX.Element => {
        const children = props.children;
        if (typeof children !== 'function') return children;
        return (
            <Show when={'item' in props ? props.item : null}>
                {(item) => children(item())}
            </Show>
        );
    };
    const confirm = () => {
        if (!('item' in props)) return props.onConfirm();
        const item = props.item;
        if (item != null) props.onConfirm(item);
    };
    return (
        <Modal
            open={open()}
            title={props.title}
            role="alertdialog"
            onClose={props.onCancel}
        >
            <div class="confirm-text">{body()}</div>
            <div class="actions-row actions-row--end">
                <Button
                    variant="ghost"
                    autofocus
                    onClick={() => props.onCancel()}
                >
                    {i18n.t('cancel', 'Cancel')}
                </Button>
                <Button variant="danger" busy={props.busy} onClick={confirm}>
                    {props.confirm}
                </Button>
            </div>
        </Modal>
    );
}
