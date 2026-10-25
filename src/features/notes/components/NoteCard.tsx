import { Show } from 'solid-js';
import {
    AiFillPushpin,
    AiOutlineClockCircle,
    AiOutlineTeam,
} from 'solid-icons/ai';
import { useAuth } from '@shared/api/auth-provider';
import type { Note } from '@shared/api/types';
import { DateHelper } from '@shared/lib/date-helper';
import { plainText } from '@shared/lib/markdown';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';

const EXCERPT = 180;

/** A note in the list: its title, the start of its text, who shared it, when it changed. */
export default function NoteCard(props: { note: Note; onOpen: () => void }) {
    const t = useLocalizer('notes');
    const i18n = useI18n();
    const { user } = useAuth();

    const excerpt = () => {
        const text = plainText(props.note.body);
        return text.length > EXCERPT ? `${text.slice(0, EXCERPT - 1)}…` : text;
    };

    return (
        <button
            type="button"
            class="note-card card"
            onClick={() => props.onOpen()}
        >
            <span class="note-card-head">
                <span class="note-card-title">{props.note.title}</span>
                <Show when={props.note.pinned}>
                    <AiFillPushpin
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
                        <AiOutlineTeam aria-hidden="true" />{' '}
                        {t('card.from', 'from {name}').replace(
                            '{name}',
                            props.note.owner.name
                        )}
                    </span>
                </Show>
                <Show when={props.note.remindAt}>
                    {(at) => (
                        <span>
                            <AiOutlineClockCircle aria-hidden="true" />{' '}
                            {DateHelper.format(
                                at(),
                                user()?.timeZone,
                                i18n.currentLocale()
                            )}
                        </span>
                    )}
                </Show>
                <span>
                    {DateHelper.format(
                        props.note.updatedAt,
                        user()?.timeZone,
                        i18n.currentLocale()
                    )}
                </span>
            </span>
        </button>
    );
}
