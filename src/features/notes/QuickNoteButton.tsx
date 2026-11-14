import { createSignal } from 'solid-js';
import { IconFilePlus } from '@shared/ui/icons';
import { useLocalizer } from '@shared/i18n/i18n-context';
import HeaderButton from '@shared/ui/HeaderButton';
import NoteEditorModal from './components/NoteEditorModal';

/**
 * The top bar's quick note: a new note in a dialog, from any page. Saving
 * it asks an open notes list again (the mutation's cache work). It reads
 * nothing itself: no request before a note is saved.
 */
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
            <NoteEditorModal open={open()} onClose={() => setOpen(false)} />
        </>
    );
}
