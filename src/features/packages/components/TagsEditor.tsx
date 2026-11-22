import { createSignal, For, Show } from 'solid-js';
import type { WorkflowPackage } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import FieldError, { errorId } from '@shared/ui/forms/FieldError';
import { createForm } from '@shared/ui/forms/form';
import RemoveButton from '@shared/ui/RemoveButton';
import SettingsCard from '@shared/ui/SettingsCard';
import { updatePackageMutation } from '@features/packages/api/packages';
import { tagClass } from '@features/packages/tags';

const FIELD = 'package-tags-input';
const MAX_TAGS = 10;

/** A tag as the server keeps it: lower case, spaces as dashes. */
const normalizeTag = (text: string) =>
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
export default function TagsEditor(props: { pkg: WorkflowPackage }) {
    const t = useLocalizer('workflows');
    // A save in another card keeps unsaved tags here: a field the user
    // changed does not follow the new package.
    const form = createForm({
        id: 'package',
        initial: () => ({ tags: props.pkg.tags }),
    });
    // The text being typed: not a tag yet, so not a field of the form.
    const [draft, setDraft] = createSignal('');
    const updating = form.mutation(updatePackageMutation);
    const tags = () => form.values.tags;
    const setTags = (next: string[]) => form.set('tags', next);
    const invalid = () => !!form.errorsOf('tags');

    function add() {
        const tag = normalizeTag(draft());
        setDraft('');
        if (!tag || tags().includes(tag) || tags().length >= MAX_TAGS) return;
        setTags([...tags(), tag]);
    }

    const send = form.onSubmit((values) =>
        updating.run({ pkg: props.pkg, patch: values })
    );
    // What is typed but not added yet goes with the save.
    function save(e: SubmitEvent) {
        if (!form.busy()) add();
        send(e);
    }

    return (
        <SettingsCard
            title={t('ui.tags', 'Tags')}
            description={t(
                'tags.description',
                'What it is about: Explore filters by them.'
            )}
            onSubmit={save}
            hint={t('tags.hint', 'Enter or a comma adds one; up to 10.')}
            actions={
                <Button
                    type="submit"
                    variant="ghost"
                    busy={form.busy()}
                    disabled={!form.dirty() && !draft().trim()}
                >
                    {t('settings.save', 'Save')}
                </Button>
            }
        >
            <ErrorSummary {...form.summary} inputId={() => FIELD} />
            <label class="visually-hidden" for={FIELD}>
                {t('ui.tags', 'Tags')}
            </label>
            <div
                class="field package-tags-field"
                classList={{ invalid: invalid() }}
            >
                <ul class="package-tags">
                    <For each={tags()}>
                        {(tag) => (
                            <li>
                                <span class={tagClass(tag)}>
                                    {tag}
                                    <RemoveButton
                                        class="package-tag-remove"
                                        label={t(
                                            'tags.remove',
                                            'Remove {tag}',
                                            { tag }
                                        )}
                                        onClick={() =>
                                            setTags(
                                                tags().filter((x) => x !== tag)
                                            )
                                        }
                                    />
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
                        disabled={form.busy()}
                        aria-invalid={invalid()}
                        aria-describedby={
                            invalid() ? errorId(FIELD) : undefined
                        }
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
                                setTags(tags().slice(0, -1));
                        }}
                    />
                </Show>
            </div>
            <FieldError for={FIELD} errors={form.errorsOf('tags')} />
        </SettingsCard>
    );
}
