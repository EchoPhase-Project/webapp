import { createSignal } from 'solid-js';
import { useLocalizer } from '@shared/i18n/i18n-context';
import ShareList from '@shared/ui/ShareList';
import Switch from '@shared/ui/Switch';
import {
    noteSharesQuery,
    shareNoteMutation,
    unshareNoteMutation,
} from '@features/notes/api';

/** Whom the note is shared with, for its owner: add by username, remove. */
export default function ShareSection(props: { noteId: string }) {
    const t = useLocalizer('notes');
    const [canEdit, setCanEdit] = createSignal(false);

    return (
        <ShareList
            id="note-share"
            class="note-share"
            title={t('share.title', 'Shared with')}
            empty={t('share.none', 'Only you see this note.')}
            removeLabel={(name) =>
                t('share.remove', 'Stop sharing with {name}', { name })
            }
            query={noteSharesQuery(props.noteId)}
            share={(queryClient) =>
                shareNoteMutation(queryClient, props.noteId, canEdit())
            }
            unshare={(queryClient) =>
                unshareNoteMutation(queryClient, props.noteId)
            }
            detail={(share) => (
                <span class="muted">
                    {share.canEdit
                        ? t('share.can_edit', 'can edit')
                        : t('share.can_read', 'can read')}
                </span>
            )}
            options={
                <Switch
                    checked={canEdit()}
                    onChange={setCanEdit}
                    label={t('share.edit', 'May edit')}
                />
            }
        />
    );
}
