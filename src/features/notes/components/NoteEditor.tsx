import { createSignal, Show, type JSX } from 'solid-js';
import { createSubmit } from '@shared/api/submit';
import type { Note } from '@shared/api/types';
import { DateHelper } from '@shared/lib/date-helper';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import Field from '@shared/ui/forms/Field';
import Markdown from '@shared/ui/Markdown';
import MarkdownEditor from '@shared/ui/MarkdownEditor';
import Switch from '@shared/ui/Switch';
import { createNoteMutation, updateNoteMutation } from '@features/notes/api';

const FIELDS = ['title', 'body', 'remindAt'] as const;
const inputId = (field: string) => `note-${field}`;

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

    // Seeded once: edits stay local until saved.
    // eslint-disable-next-line solid/reactivity
    const [title, setTitle] = createSignal(props.note?.title ?? '');
    // eslint-disable-next-line solid/reactivity
    const [body, setBody] = createSignal(props.note?.body ?? '');
    // eslint-disable-next-line solid/reactivity
    const [pinned, setPinned] = createSignal(props.note?.pinned ?? false);
    const [remindAt, setRemindAt] = createSignal(
        // eslint-disable-next-line solid/reactivity
        props.note?.remindAt
            ? // eslint-disable-next-line solid/reactivity
              DateHelper.toLocalInput(new Date(props.note.remindAt))
            : ''
    );
    const submit = createSubmit(FIELDS);
    const { busy, errors } = submit;
    const create = submit.mutation(createNoteMutation);
    const update = submit.mutation(updateNoteMutation);

    async function save(e?: Event) {
        e?.preventDefault();
        if (busy()) return;
        const input = {
            title: title(),
            body: body(),
            pinned: pinned(),
            remindAt: DateHelper.fromLocalInput(remindAt()),
            // Saved only over the version opened: someone else's save meanwhile is a conflict.
            expectedStamp: props.note?.stamp ?? null,
        };
        const note = props.note;
        const onSaved = (saved: Note) => props.onSaved(saved);
        await (note
            ? update.run({ id: note.id, body: input }, onSaved)
            : create.run(input, onSaved));
    }

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void save(e);
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
                onSubmit={(e) => void save(e)}
                onKeyDown={onKeyDown}
                noValidate
            >
                <ErrorSummary errors={errors()} inputId={inputId} />

                <Field
                    id={inputId('title')}
                    name="title"
                    label={t('editor.title', 'Title (optional)')}
                    errors={errors().title}
                    type="text"
                    maxLength={200}
                    disabled={busy()}
                    value={title()}
                    onInput={(e) => setTitle(e.currentTarget.value)}
                />

                <MarkdownEditor
                    id={inputId('body')}
                    name="body"
                    label={t('editor.body', 'Text')}
                    aside={t('editor.markdown', 'Markdown works')}
                    errors={errors().body}
                    placeholder={t(
                        'editor.placeholder',
                        'Write in Markdown: # heading, **bold**, - list, [link](https://…)'
                    )}
                    rows={12}
                    maxLength={100000}
                    disabled={busy()}
                    value={body()}
                    onInput={setBody}
                />

                <Show when={isOwner()}>
                    <Switch
                        checked={pinned()}
                        onChange={setPinned}
                        label={t('editor.pinned', 'Pin to the top')}
                    />
                    <Field
                        id={inputId('remindAt')}
                        name="remindAt"
                        label={t(
                            'editor.remind',
                            'Remind me (optional, your local time)'
                        )}
                        showLabel
                        errors={errors().remindAt}
                        type="datetime-local"
                        disabled={busy()}
                        value={remindAt()}
                        onInput={(e) => setRemindAt(e.currentTarget.value)}
                    />
                </Show>

                <div class="actions-row">
                    <Button type="submit" busy={busy()}>
                        {t('ui.save', 'Save')}
                    </Button>
                    {props.footer}
                </div>
            </form>
        </Show>
    );
}
