import { Show, type JSX } from 'solid-js';
import type { Note } from '@shared/api/types';
import { DateHelper } from '@shared/lib/date-helper';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import Field from '@shared/ui/forms/Field';
import { createForm } from '@shared/ui/forms/form';
import Markdown from '@shared/ui/Markdown';
import MarkdownEditor from '@shared/ui/MarkdownEditor';
import Switch from '@shared/ui/Switch';
import { createNoteMutation, updateNoteMutation } from '@features/notes/api';

/**
 * A note's title and Markdown text, written or previewed; its pin and
 * reminder for its owner. A note shared to read is only shown. Ctrl+Enter
 * saves.
 */
export default function NoteEditor(props: {
    /** Absent: a new note. */
    note?: Note;
    onSaved: (note: Note) => void;
    /** Under the form: delete, share (the owner's). */
    footer?: JSX.Element;
}) {
    const t = useLocalizer('notes');
    const isNew = () => !props.note;
    const isOwner = () => isNew() || props.note!.access === 'Owner';
    const readOnly = () => props.note?.access === 'Read';

    // Edits stay local until saved; a field not edited follows the note.
    const form = createForm({
        id: 'note',
        initial: () => ({
            title: props.note?.title ?? '',
            body: props.note?.body ?? '',
            pinned: props.note?.pinned ?? false,
            remindAt: props.note?.remindAt
                ? DateHelper.toLocalInput(new Date(props.note.remindAt))
                : '',
        }),
    });
    const create = form.mutation(createNoteMutation);
    const update = form.mutation(updateNoteMutation);

    const save = form.onSubmit((values) => {
        const input = {
            ...values,
            remindAt: DateHelper.fromLocalInput(values.remindAt),
            // Saved only over the version opened: someone else's save meanwhile is a conflict.
            expectedStamp: props.note?.stamp ?? null,
        };
        const note = props.note;
        const onSaved = (saved: Note) => props.onSaved(saved);
        return note
            ? update.run({ id: note.id, body: input }, onSaved)
            : create.run(input, onSaved);
    });

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save(e);
    };

    return (
        <Show
            when={!readOnly()}
            fallback={
                <div class="note-view">
                    <Markdown text={props.note!.body} />
                    {props.footer}
                </div>
            }
        >
            <form
                class="vert-form note-editor"
                onSubmit={save}
                onKeyDown={onKeyDown}
                noValidate
            >
                <ErrorSummary {...form.summary} />

                <Field
                    {...form.input('title')}
                    label={t('editor.title', 'Title (optional)')}
                    type="text"
                    maxLength={200}
                />

                <MarkdownEditor
                    {...form.control('body')}
                    label={t('editor.body', 'Text')}
                    aside={t('editor.markdown', 'Markdown works')}
                    placeholder={t(
                        'editor.placeholder',
                        'Write in Markdown: # heading, **bold**, - list, [link](https://…)'
                    )}
                    rows={12}
                    maxLength={100000}
                />

                <Show when={isOwner()}>
                    <Switch
                        {...form.toggle('pinned')}
                        label={t('editor.pinned', 'Pin to the top')}
                    />
                    <Field
                        {...form.input('remindAt')}
                        label={t(
                            'editor.remind',
                            'Remind me (optional, your local time)'
                        )}
                        showLabel
                        type="datetime-local"
                    />
                </Show>

                <div class="actions-row">
                    <Button type="submit" busy={form.busy()}>
                        {t('ui.save', 'Save')}
                    </Button>
                    {props.footer}
                </div>
            </form>
        </Show>
    );
}
