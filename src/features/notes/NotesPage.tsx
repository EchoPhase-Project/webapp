import { createEffect, createSignal, For, on, Show } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { useQuery, useQueryClient } from '@tanstack/solid-query';
import { IconPlus, IconSearch } from '@shared/ui/icons';
import { usePageMeta } from '@shared/meta/page-meta';
import type { Note } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { createDebounced } from '@shared/lib/debounced';
import CardGrid from '@shared/ui/CardGrid';
import Button from '@shared/ui/Button';
import Field from '@shared/ui/forms/Field';
import PageHeader from '@shared/ui/PageHeader';
import QueryState from '@shared/ui/QueryState';
import { noteQuery, notesQuery } from './api';
import NoteCard from './components/NoteCard';
import NoteEditorModal from './components/NoteEditorModal';
import './notes.scss';

/** The user's notes and those shared with them: search, open, write. */
export default function NotesPage() {
    const queryClient = useQueryClient();
    const t = useLocalizer('notes');
    const [params, setParams] = useSearchParams<{ open?: string }>();

    usePageMeta(() => ({
        title: t('title', 'Notes'),
        description: t('description', 'Your notes, and those shared with you.'),
    }));

    const [query, setQuery] = createSignal('');
    // The search waits for a pause in typing.
    const [search, setSearch] = createSignal('');
    const debounce = createDebounced(250);
    const onSearch = (value: string) => {
        setQuery(value);
        debounce(() => setSearch(value.trim()));
    };

    // The list follows the cache: a save, a delete or a note shared with
    // the user (an event) asks it again.
    const notes = useQuery(() => notesQuery(search()));

    // What the dialog shows: null closed, undefined a new note.
    const [editing, setEditing] = createSignal<Note | null | undefined>(null);

    // /notes?open=<id> (a notification's link) opens that note; one gone or
    // not shared any more opens nothing.
    createEffect(
        on(
            () => params.open,
            async (id) => {
                if (!id) return;
                const note = await queryClient
                    .fetchQuery(noteQuery(id))
                    .catch(() => undefined);
                if (note) setEditing(note);
                setParams({ open: undefined }, { replace: true });
            }
        )
    );

    return (
        <div class="page-stack">
            <PageHeader
                eyebrow={t('eyebrow', 'Workspace')}
                title={t('title', 'Notes')}
                description={t('lead', 'Notes in Markdown.')}
                docs="notes"
                actions={
                    <Button onClick={() => setEditing(undefined)}>
                        <IconPlus />
                        {t('new', 'New note')}
                    </Button>
                }
            />

            <div class="notes-search">
                <Field
                    id="notes-search"
                    name="q"
                    type="search"
                    icon={IconSearch}
                    label={t('search', 'Search notes')}
                    value={query()}
                    onInput={(e) => onSearch(e.currentTarget.value)}
                />
            </div>

            <QueryState
                query={notes}
                empty={
                    search()
                        ? t('none_found', 'No notes match.')
                        : t('empty', 'No notes yet.')
                }
                emptyAction={
                    <Show when={!search()}>
                        <Button onClick={() => setEditing(undefined)}>
                            {t('first', 'Write the first one')}
                        </Button>
                    </Show>
                }
            >
                {(list) => (
                    <CardGrid>
                        <For each={list()}>
                            {(note) => (
                                <NoteCard
                                    note={note}
                                    onOpen={() => setEditing(note)}
                                />
                            )}
                        </For>
                    </CardGrid>
                )}
            </QueryState>

            <NoteEditorModal
                open={editing() !== null}
                note={editing() ?? undefined}
                onClose={() => setEditing(null)}
                onGone={() => setEditing(null)}
            />
        </div>
    );
}
