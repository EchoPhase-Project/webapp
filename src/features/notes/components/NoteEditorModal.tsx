import { createSignal, Show } from 'solid-js';
import { useAuth } from '@shared/api/auth-provider';
import type { Note } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import Modal from '@shared/ui/Modal';
import { deleteNote, unshareNote } from '@features/notes/api';
import NoteEditor from './NoteEditor';
import ShareSection from './ShareSection';

/**
 * A note in a dialog: a new one, or one to edit (its owner also shares and
 * deletes it; someone it is shared with may leave it).
 */
export default function NoteEditorModal(props: {
    open: boolean;
    /** Absent: a new note. */
    note?: Note;
    onClose: () => void;
    onSaved?: (note: Note) => void;
    /** It was deleted, or the user left it. */
    onGone?: (id: string) => void;
}) {
    const t = useLocalizer('notes');
    const { user } = useAuth();
    const [sharing, setSharing] = createSignal(false);
    const [confirming, setConfirming] = createSignal(false);
    const [busy, setBusy] = createSignal(false);

    const title = () =>
        !props.note
            ? t('editor.new', 'New note')
            : props.note.access === 'Read'
              ? props.note.title
              : t('editor.edit', 'Edit note');

    async function gone(call: () => Promise<{ ok: boolean }>) {
        setBusy(true);
        try {
            const result = await call();
            if (result.ok && props.note) props.onGone?.(props.note.id);
        } finally {
            setBusy(false);
            setConfirming(false);
        }
    }

    const close = () => {
        setSharing(false);
        props.onClose();
    };

    const footer = () => (
        <Show when={props.note}>
            {(note) => (
                <Show
                    when={note().access === 'Owner'}
                    fallback={
                        <Button
                            variant="ghost"
                            disabled={busy()}
                            onClick={() =>
                                void gone(() =>
                                    unshareNote(note().id, user()?.id ?? '')
                                )
                            }
                        >
                            {t('editor.leave', 'Leave this note')}
                        </Button>
                    }
                >
                    <Button
                        variant="ghost"
                        aria-expanded={sharing()}
                        onClick={() => setSharing((v) => !v)}
                    >
                        {t('editor.share', 'Share')}
                    </Button>
                    <Button
                        variant="danger-outline"
                        disabled={busy()}
                        onClick={() => setConfirming(true)}
                    >
                        {t('editor.delete', 'Delete')}
                    </Button>
                </Show>
            )}
        </Show>
    );

    return (
        <>
            <Modal open={props.open} title={title()} onClose={close} wide>
                <Show when={props.open}>
                    <Show when={props.note?.access !== 'Owner' && props.note}>
                        {(note) => (
                            <p class="muted note-owner">
                                {t('editor.owner', 'Shared by {name}').replace(
                                    '{name}',
                                    note().owner.name
                                )}
                            </p>
                        )}
                    </Show>
                    <NoteEditor
                        note={props.note}
                        onSaved={(note) => {
                            props.onSaved?.(note);
                            close();
                        }}
                        footer={footer()}
                    />
                    <Show when={sharing() && props.note}>
                        {(note) => <ShareSection noteId={note().id} />}
                    </Show>
                </Show>
            </Modal>

            <ConfirmDialog
                open={confirming()}
                title={t('confirm_delete.title', 'Delete this note?')}
                confirm={t('confirm_delete.action', 'Delete')}
                busy={busy()}
                onConfirm={() => {
                    const id = props.note!.id;
                    void gone(() => deleteNote(id));
                }}
                onCancel={() => setConfirming(false)}
            >
                <p>
                    {t(
                        'confirm_delete.text',
                        '{title} is deleted for good, for everyone it is shared with too.'
                    ).replace('{title}', props.note?.title ?? '')}
                </p>
            </ConfirmDialog>
        </>
    );
}
