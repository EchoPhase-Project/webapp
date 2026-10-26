import { createEffect, createSignal, For, Show } from 'solid-js';
import { AiOutlineClose } from 'solid-icons/ai';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import type { WorkflowPackage } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import FieldError from '@shared/ui/FieldError';
import { inputOf, updatePackage } from '@features/packages/api';
import { tagClass } from '@features/packages/tags';

const FIELD = 'package-tags-input';
const MAX_TAGS = 10;

/** A tag as the server keeps it: lower case, spaces as dashes. */
export const normalizeTag = (text: string) =>
    text
        .trim()
        .toLowerCase()
        .split(/[\s_]+/)
        .filter(Boolean)
        .join('-');

/**
 * A package's tags as capsules: Enter or a comma adds what is typed, the
 * cross on one removes it; saved together.
 */
export default function TagsEditor(props: {
    pkg: WorkflowPackage;
    onSaved: (pkg: WorkflowPackage) => void;
}) {
    const t = useLocalizer('workflows');
    const [tags, setTags] = createSignal<string[]>([]);
    createEffect(() => setTags([...props.pkg.tags]));
    const [draft, setDraft] = createSignal('');
    const [errors, setErrors] = createSignal<FormErrors>({});
    const [busy, setBusy] = createSignal(false);

    const changed = () => tags().join(',') !== props.pkg.tags.join(',');

    function add() {
        const tag = normalizeTag(draft());
        setDraft('');
        if (!tag || tags().includes(tag) || tags().length >= MAX_TAGS) return;
        setTags((list) => [...list, tag]);
    }

    async function save(e: Event) {
        e.preventDefault();
        add();
        setBusy(true);
        try {
            const result = await updatePackage(props.pkg.id, {
                ...inputOf(props.pkg),
                tags: tags(),
            });
            if (!result.ok) {
                setErrors(groupErrors(result.errors, ['tags']));
                return;
            }
            setErrors({});
            props.onSaved(result.data);
        } finally {
            setBusy(false);
        }
    }

    return (
        <form
            class="package-tags-editor"
            onSubmit={(e) => void save(e)}
            noValidate
        >
            <label class="field-label" for={FIELD}>
                {t('tags.label', 'Tags (up to 10): Enter or a comma adds one')}
            </label>
            <div class="field package-tags-field">
                <ul class="package-tags">
                    <For each={tags()}>
                        {(tag) => (
                            <li>
                                <span class={tagClass(tag)}>
                                    {tag}
                                    <button
                                        type="button"
                                        class="package-tag-remove"
                                        aria-label={t(
                                            'tags.remove',
                                            'Remove {tag}'
                                        ).replace('{tag}', tag)}
                                        onClick={() =>
                                            setTags((list) =>
                                                list.filter((x) => x !== tag)
                                            )
                                        }
                                    >
                                        <AiOutlineClose aria-hidden="true" />
                                    </button>
                                </span>
                            </li>
                        )}
                    </For>
                </ul>
                <Show when={tags().length < MAX_TAGS}>
                    <input
                        id={FIELD}
                        class="field-input"
                        type="text"
                        autocomplete="off"
                        maxLength={32}
                        disabled={busy()}
                        value={draft()}
                        onInput={(e) => {
                            const value = e.currentTarget.value;
                            if (value.endsWith(',')) {
                                setDraft(value.slice(0, -1));
                                add();
                            } else setDraft(value);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                add();
                            } else if (
                                e.key === 'Backspace' &&
                                !draft() &&
                                tags().length > 0
                            )
                                setTags((list) => list.slice(0, -1));
                        }}
                    />
                </Show>
            </div>
            <FieldError for={FIELD} errors={errors().tags} />
            <span>
                <Button
                    type="submit"
                    variant="ghost"
                    busy={busy()}
                    disabled={!changed() && !draft().trim()}
                >
                    {t('settings.save', 'Save')}
                </Button>
            </span>
        </form>
    );
}
