import { Show } from 'solid-js';
import { IconClock, IconPinnedFilled, IconUsers } from '@shared/ui/icons';
import type { Note } from '@shared/api/types';
import { useDateFormat } from '@shared/lib/date-format';
import { plainText } from '@shared/lib/markdown';
import { useLocalizer } from '@shared/i18n/i18n-context';

const EXCERPT = 180;

/** A note in the list: its title, the start of its text, who shared it, when it changed. */
export default function NoteCard(props: { note: Note; onOpen: () => void }) {
    const t = useLocalizer('notes');
    const date = useDateFormat();

    const excerpt = () => {
        const text = plainText(props.note.body);
        return text.length > EXCERPT ? `${text.slice(0, EXCERPT - 1)}…` : text;
    };

    return (
        // eslint-disable-next-line no-restricted-syntax -- a card that opens the note as a whole, not an action button
        <button
            type="button"
            class="note-card card"
            onClick={() => props.onOpen()}
        >
            <span class="note-card-head">
                <span class="note-card-title">{props.note.title}</span>
                <Show when={props.note.pinned}>
                    <IconPinnedFilled
                        class="note-card-icon"
                        aria-label={t('card.pinned', 'Pinned')}
                    />
                </Show>
            </span>
            <Show when={excerpt()}>
                <span class="note-card-text">{excerpt()}</span>
            </Show>
            <span class="note-card-meta muted">
                <Show when={props.note.access !== 'Owner'}>
                    <span>
                        <IconUsers aria-hidden="true" />{' '}
                        {t('card.from', 'from {name}', {
                            name: props.note.owner.name,
                        })}
                    </span>
                </Show>
                <Show when={props.note.remindAt}>
                    {(at) => (
                        <span>
                            <IconClock aria-hidden="true" /> {date(at())}
                        </span>
                    )}
                </Show>
                <span>{date(props.note.updatedAt)}</span>
            </span>
        </button>
    );
}
