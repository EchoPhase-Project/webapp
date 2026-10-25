import { createResource, createSignal, For, Show } from 'solid-js';
import { AiOutlineClose } from 'solid-icons/ai';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Field from '@shared/ui/Field';
import Switch from '@shared/ui/Switch';
import { listShares, shareNote, unshareNote } from '@features/notes/api';

const inputId = (field: string) => `note-share-${field}`;

/** Whom the note is shared with, for its owner: add by username, remove. */
export default function ShareSection(props: { noteId: string }) {
    const t = useLocalizer('notes');
    const [shares, { refetch }] = createResource(
        () => props.noteId,
        listShares
    );
    const [userName, setUserName] = createSignal('');
    const [canEdit, setCanEdit] = createSignal(false);
    const [errors, setErrors] = createSignal<FormErrors>({});
    const [busy, setBusy] = createSignal(false);

    async function add(e: Event) {
        e.preventDefault();
        if (!userName().trim()) return;
        setBusy(true);
        try {
            const result = await shareNote(
                props.noteId,
                userName().trim(),
                canEdit()
            );
            if (!result.ok) {
                setErrors(groupErrors(result.errors, []));
                return;
            }
            setErrors({});
            setUserName('');
            await refetch();
        } finally {
            setBusy(false);
        }
    }

    async function remove(userId: string) {
        setBusy(true);
        try {
            await unshareNote(props.noteId, userId);
            await refetch();
        } finally {
            setBusy(false);
        }
    }

    return (
        <section class="note-share">
            <h3>{t('share.title', 'Shared with')}</h3>
            <Show
                when={(shares() ?? []).length > 0}
                fallback={
                    <p class="muted">
                        {t('share.none', 'Only you see this note.')}
                    </p>
                }
            >
                <ul class="note-share-list">
                    <For each={shares()}>
                        {(share) => (
                            <li>
                                <span>
                                    {share.user.name}{' '}
                                    <span class="muted">
                                        @{share.user.userName}
                                    </span>
                                </span>
                                <span class="muted">
                                    {share.canEdit
                                        ? t('share.can_edit', 'can edit')
                                        : t('share.can_read', 'can read')}
                                </span>
                                <Button
                                    variant="icon"
                                    disabled={busy()}
                                    aria-label={t(
                                        'share.remove',
                                        'Stop sharing with {name}'
                                    ).replace('{name}', share.user.name)}
                                    onClick={() => void remove(share.user.id)}
                                >
                                    <AiOutlineClose />
                                </Button>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>

            <form
                class="note-share-form"
                onSubmit={(e) => void add(e)}
                noValidate
            >
                <ErrorSummary errors={errors()} inputId={inputId} />
                <Field
                    id={inputId('userName')}
                    name="userName"
                    label={t('share.username', 'Username')}
                    type="text"
                    autocomplete="off"
                    disabled={busy()}
                    value={userName()}
                    onInput={(e) => setUserName(e.currentTarget.value)}
                />
                <Switch
                    checked={canEdit()}
                    onChange={setCanEdit}
                    label={t('share.edit', 'May edit')}
                />
                <Button type="submit" variant="ghost" busy={busy()}>
                    {t('share.add', 'Share')}
                </Button>
            </form>
        </section>
    );
}
