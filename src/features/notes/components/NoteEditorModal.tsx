import { createSignal, Show } from 'solid-js';
import { useAuth } from '@shared/api/auth';
import { createSubmit } from '@shared/api/submit';
import type { Note } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import ErrorSummary from '@shared/ui/ErrorSummary';
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
    // Each shows its own failure: deleting in its confirm dialog (which stays
    // open), leaving under the editor's buttons.
    const deleting = createSubmit();
    const leaving = createSubmit();
    const busy = () => deleting.busy() || leaving.busy();

    const title = () =>
        !props.note
            ? t('editor.new', 'New note')
            : props.note.access === 'Read'
              ? props.note.title
              : t('editor.edit', 'Edit note');

    function remove(note: Note) {
        return deleting.run(
            () => deleteNote(note.id),
            () => {
                setConfirming(false);
                props.onGone?.(note.id);
            }
        );
    }

    function leave(note: Note) {
        return leaving.run(
            () => unshareNote(note.id, user()?.id ?? ''),
            () => props.onGone?.(note.id)
        );
    }

    const cancelDelete = () => {
        setConfirming(false);
        deleting.setErrors({});
    };

    const close = () => {
        setSharing(false);
        leaving.setErrors({});
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
                            onClick={() => void leave(note())}
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
                        {t('ui.share', 'Share')}
                    </Button>
                    <Button
                        variant="danger-outline"
                        disabled={busy()}
                        onClick={() => setConfirming(true)}
                    >
                        {t('ui.delete', 'Delete')}
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
                                {t('editor.owner', 'Shared by {name}', {
                                    name: note().owner.name,
                                })}
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
                    <ErrorSummary errors={leaving.errors()} />
                    <Show when={sharing() && props.note}>
                        {(note) => <ShareSection noteId={note().id} />}
                    </Show>
                </Show>
            </Modal>

            <ConfirmDialog
                item={confirming() ? props.note : null}
                title={t('confirm_delete.title', 'Delete this note?')}
                confirm={t('ui.delete', 'Delete')}
                busy={deleting.busy()}
                errors={deleting.errors()}
                onConfirm={(note) => void remove(note)}
                onCancel={cancelDelete}
            >
                {(note) => (
                    <p>
                        {t(
                            'confirm_delete.text',
                            '{title} is deleted for good, for everyone it is shared with too.',
                            { title: note.title }
                        )}
                    </p>
                )}
            </ConfirmDialog>
        </>
    );
}
