import { createSignal, Show, type JSX } from 'solid-js';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import type { Note } from '@shared/api/types';
import { DateHelper } from '@shared/lib/date-helper';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Field from '@shared/ui/Field';
import Markdown from '@shared/ui/Markdown';
import Switch from '@shared/ui/Switch';
import { createNote, updateNote } from '@features/notes/api';

const FIELDS = ['title', 'body'] as const;
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
    const [preview, setPreview] = createSignal(false);
    const [errors, setErrors] = createSignal<FormErrors>({});
    const [busy, setBusy] = createSignal(false);

    async function save(e?: Event) {
        e?.preventDefault();
        if (busy()) return;
        setBusy(true);
        try {
            const input = {
                title: title(),
                body: body(),
                pinned: pinned(),
                remindAt: DateHelper.fromLocalInput(remindAt()),
            };
            const result = props.note
                ? await updateNote(props.note.id, input)
                : await createNote(input);
            if (!result.ok) {
                setErrors(groupErrors(result.errors, FIELDS));
                return;
            }
            setErrors({});
            props.onSaved(result.data);
        } finally {
            setBusy(false);
        }
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

                <div class="note-tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={!preview()}
                        class="note-tab"
                        onClick={() => setPreview(false)}
                    >
                        {t('editor.write', 'Write')}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={preview()}
                        class="note-tab"
                        onClick={() => setPreview(true)}
                    >
                        {t('editor.preview', 'Preview')}
                    </button>
                    <span class="note-hint muted">
                        {t('editor.markdown', 'Markdown works')}
                    </span>
                </div>

                <Show
                    when={!preview()}
                    fallback={
                        <div class="note-preview">
                            <Show
                                when={body().trim()}
                                fallback={
                                    <p class="muted">
                                        {t(
                                            'editor.nothing',
                                            'Nothing to preview yet'
                                        )}
                                    </p>
                                }
                            >
                                <Markdown text={body()} />
                            </Show>
                        </div>
                    }
                >
                    <label class="visually-hidden" for={inputId('body')}>
                        {t('editor.body', 'Text')}
                    </label>
                    <textarea
                        id={inputId('body')}
                        name="body"
                        class="note-body-input"
                        classList={{ invalid: !!errors().body?.length }}
                        placeholder={t(
                            'editor.placeholder',
                            'Write in Markdown: # heading, **bold**, - list, [link](https://…)'
                        )}
                        rows={12}
                        maxLength={100000}
                        disabled={busy()}
                        value={body()}
                        onInput={(e) => setBody(e.currentTarget.value)}
                    />
                </Show>

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
                        type="datetime-local"
                        disabled={busy()}
                        value={remindAt()}
                        onInput={(e) => setRemindAt(e.currentTarget.value)}
                    />
                </Show>

                <div class="note-actions">
                    <Button type="submit" busy={busy()}>
                        {t('editor.save', 'Save')}
                    </Button>
                    {props.footer}
                </div>
            </form>
        </Show>
    );
}
