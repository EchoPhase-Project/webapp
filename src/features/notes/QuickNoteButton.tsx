import { createSignal } from 'solid-js';
import { IconFilePlus } from '@shared/ui/icons';
import { useLocalizer } from '@shared/i18n/i18n-context';
import HeaderButton from '@shared/ui/HeaderButton';
import NoteEditorModal from './components/NoteEditorModal';
import { notesChanged } from './notes-changes';

/** The top bar's quick note: a new note in a dialog, from any page. */
export default function QuickNoteButton() {
    const t = useLocalizer('notes');
    const [open, setOpen] = createSignal(false);

    return (
        <>
            <HeaderButton
                label={t('quick', 'New note')}
                onClick={() => setOpen(true)}
            >
                <IconFilePlus />
            </HeaderButton>
            <NoteEditorModal
                open={open()}
                onClose={() => setOpen(false)}
                onSaved={() => notesChanged()}
            />
        </>
    );
}
