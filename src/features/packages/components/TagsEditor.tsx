import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { createSubmit } from '@shared/api/submit';
import type { WorkflowPackage } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import FieldError, { errorId } from '@shared/ui/forms/FieldError';
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
    const [tags, setTags] = createSignal<string[]>([]);
    // Follows the saved tags only when they change: a save in another card
    // (a new package, the same tags) keeps what is not saved here.
    const saved = createMemo(() => [...props.pkg.tags], [], {
        equals: (a, b) => a.join(',') === b.join(','),
    });
    createEffect(() => setTags(saved()));
    const [draft, setDraft] = createSignal('');
    const { busy, errors, mutation } = createSubmit(['tags']);
    const updating = mutation(updatePackageMutation);

    const invalid = () => !!errors().tags?.length;
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
        await updating.run({ pkg: props.pkg, patch: { tags: tags() } });
    }

    return (
        <SettingsCard
            title={t('ui.tags', 'Tags')}
            description={t(
                'tags.description',
                'What it is about: Explore filters by them.'
            )}
            onSubmit={(e) => void save(e)}
            hint={t('tags.hint', 'Enter or a comma adds one; up to 10.')}
            actions={
                <Button
                    type="submit"
                    variant="ghost"
                    busy={busy()}
                    disabled={!changed() && !draft().trim()}
                >
                    {t('settings.save', 'Save')}
                </Button>
            }
        >
            <ErrorSummary errors={errors()} inputId={() => FIELD} />
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
                                            setTags((list) =>
                                                list.filter((x) => x !== tag)
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
                        disabled={busy()}
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
                                setTags((list) => list.slice(0, -1));
                        }}
                    />
                </Show>
            </div>
            <FieldError for={FIELD} errors={errors().tags} />
        </SettingsCard>
    );
}
