import {
    createEffect,
    createRenderEffect,
    createResource,
    createSignal,
    For,
    on,
    Show,
} from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { AiOutlinePlus, AiOutlineSearch } from 'solid-icons/ai';
import { useRootMeta } from '@shared/meta/page-meta';
import { useAuth } from '@shared/api/auth-provider';
import type { Note } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import EmptyState from '@shared/ui/EmptyState';
import Field from '@shared/ui/Field';
import PageHeader from '@shared/ui/PageHeader';
import { getNote, listNotes } from './api';
import NoteCard from './components/NoteCard';
import NoteEditorModal from './components/NoteEditorModal';
import { notesChanged, notesVersion } from './notes-changes';
import './notes.scss';

/** The user's notes and those shared with them: search, open, write. */
export default function NotesPage() {
    const { setTitle, setDescription } = useRootMeta();
    const { isAuthenticated } = useAuth();
    const t = useLocalizer('notes');
    const [params, setParams] = useSearchParams<{ open?: string }>();

    createRenderEffect(() => {
        setTitle(`${t('title', 'Notes')} · EchoPhase`);
        setDescription(
            t('description', 'Your notes, and those shared with you.')
        );
    });

    const [query, setQuery] = createSignal('');
    // The search waits for a pause in typing.
    const [search, setSearch] = createSignal('');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onSearch = (value: string) => {
        setQuery(value);
        clearTimeout(timer);
        timer = setTimeout(() => setSearch(value.trim()), 250);
    };

    const [notes, { refetch, mutate }] = createResource(
        () => (isAuthenticated() ? { q: search(), v: notesVersion() } : false),
        ({ q }) => listNotes(q)
    );

    // What the dialog shows: null closed, undefined a new note.
    const [editing, setEditing] = createSignal<Note | null | undefined>(null);

    // /notes?open=<id> (a notification's link) opens that note.
    createEffect(
        on(
            () => (isAuthenticated() ? params.open : undefined),
            async (id) => {
                if (!id) return;
                const result = await getNote(id);
                if (result.ok) setEditing(result.data);
                setParams({ open: undefined }, { replace: true });
            }
        )
    );

    const saved = (note: Note) => {
        mutate((list) => {
            const rest = (list ?? []).filter((n) => n.id !== note.id);
            return [note, ...rest];
        });
        void refetch();
    };

    const gone = (id: string) => {
        mutate((list) => (list ?? []).filter((n) => n.id !== id));
        setEditing(null);
        notesChanged();
    };

    return (
        <div class="notes-container">
            <PageHeader
                eyebrow={t('eyebrow', 'Workspace')}
                title={t('title', 'Notes')}
                description={t('lead', 'Notes in Markdown.')}
                docs="notes"
                actions={
                    <Button onClick={() => setEditing(undefined)}>
                        <AiOutlinePlus />
                        {t('new', 'New note')}
                    </Button>
                }
            />

            <div class="notes-search">
                <Field
                    id="notes-search"
                    name="q"
                    type="search"
                    icon={AiOutlineSearch}
                    label={t('search', 'Search notes')}
                    value={query()}
                    onInput={(e) => onSearch(e.currentTarget.value)}
                />
            </div>

            <Show
                when={(notes() ?? []).length > 0}
                fallback={
                    <Show when={!notes.loading}>
                        <EmptyState
                            action={
                                <Show when={!search()}>
                                    <Button
                                        onClick={() => setEditing(undefined)}
                                    >
                                        {t('first', 'Write the first one')}
                                    </Button>
                                </Show>
                            }
                        >
                            {search()
                                ? t('none_found', 'No notes match.')
                                : t('empty', 'No notes yet.')}
                        </EmptyState>
                    </Show>
                }
            >
                <div class="notes-grid">
                    <For each={notes()}>
                        {(note) => (
                            <NoteCard
                                note={note}
                                onOpen={() => setEditing(note)}
                            />
                        )}
                    </For>
                </div>
            </Show>

            <NoteEditorModal
                open={editing() !== null}
                note={editing() ?? undefined}
                onClose={() => setEditing(null)}
                onSaved={saved}
                onGone={gone}
            />
        </div>
    );
}
