import { createSignal, For, Show } from 'solid-js';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import type { PackageVisibility, WorkflowPackage } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Field from '@shared/ui/Field';
import FieldError from '@shared/ui/FieldError';
import Markdown from '@shared/ui/Markdown';
import Modal from '@shared/ui/Modal';
import { createPackage, updatePackage } from '@features/packages/api';
import WorkflowPicker from './WorkflowPicker';

const FIELDS = [
    'name',
    'summary',
    'readme',
    'visibility',
    'tags',
    'workflows',
    'changelog',
] as const;
const VISIBILITIES: PackageVisibility[] = ['Private', 'Unlisted', 'Public'];
const inputId = (field: string) => `package-${field}`;

/** "Discord bot, guilds" → the tags as typed; the server normalises them. */
const parseTags = (text: string) =>
    text
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

/**
 * A package's name, summary, README, tags and visibility: a new one with
 * the workflows of its first version, or an existing one (its versions are
 * published separately).
 */
export default function PackageEditorModal(props: {
    open: boolean;
    /** Absent: a new package. */
    pkg?: WorkflowPackage;
    onClose: () => void;
    onSaved: (pkg: WorkflowPackage) => void;
}) {
    const t = useLocalizer('packages');

    return (
        <Modal
            open={props.open}
            title={
                props.pkg
                    ? t('editor.edit', 'Edit package')
                    : t('editor.new', 'Publish workflows')
            }
            onClose={() => props.onClose()}
            wide
        >
            <Show when={props.open}>
                <PackageForm
                    pkg={props.pkg}
                    onSaved={(p) => props.onSaved(p)}
                />
            </Show>
        </Modal>
    );
}

function PackageForm(props: {
    pkg?: WorkflowPackage;
    onSaved: (pkg: WorkflowPackage) => void;
}) {
    const t = useLocalizer('packages');
    // The form starts from the package as opened.
    /* eslint-disable solid/reactivity */
    const [name, setName] = createSignal(props.pkg?.name ?? '');
    const [summary, setSummary] = createSignal(props.pkg?.summary ?? '');
    const [readme, setReadme] = createSignal(props.pkg?.readme ?? '');
    const [visibility, setVisibility] = createSignal<PackageVisibility>(
        props.pkg?.visibility ?? 'Private'
    );
    const [tags, setTags] = createSignal(props.pkg?.tags.join(', ') ?? '');
    /* eslint-enable solid/reactivity */
    const [workflows, setWorkflows] = createSignal<string[]>([]);
    const [preview, setPreview] = createSignal(false);
    const [errors, setErrors] = createSignal<FormErrors>({});
    const [busy, setBusy] = createSignal(false);

    async function save(e: Event) {
        e.preventDefault();
        if (busy()) return;
        setBusy(true);
        try {
            const input = {
                name: name(),
                summary: summary(),
                readme: readme(),
                visibility: visibility(),
                tags: parseTags(tags()),
                expectedStamp: props.pkg?.stamp ?? null,
            };
            const result = props.pkg
                ? await updatePackage(props.pkg.id, input)
                : await createPackage(input, { workflows: workflows() });
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

    return (
        <form
            class="vert-form package-editor"
            onSubmit={(e) => void save(e)}
            noValidate
        >
            <ErrorSummary errors={errors()} inputId={inputId} />
            <Field
                id={inputId('name')}
                name="name"
                label={t('editor.name', 'Name')}
                showLabel
                errors={errors().name}
                type="text"
                maxLength={100}
                disabled={busy()}
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
            />
            <Field
                id={inputId('summary')}
                name="summary"
                label={t(
                    'editor.summary',
                    'Summary: a sentence or two for its card'
                )}
                showLabel
                errors={errors().summary}
                type="text"
                maxLength={300}
                disabled={busy()}
                value={summary()}
                onInput={(e) => setSummary(e.currentTarget.value)}
            />

            <div class="package-readme">
                <div class="packages-tabs" role="tablist">
                    <span class="field-label package-readme-label">
                        {t('editor.readme', 'README')}
                    </span>
                    <button
                        type="button"
                        role="tab"
                        class="packages-tab"
                        aria-selected={!preview()}
                        onClick={() => setPreview(false)}
                    >
                        {t('editor.write', 'Write')}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        class="packages-tab"
                        aria-selected={preview()}
                        onClick={() => setPreview(true)}
                    >
                        {t('editor.preview', 'Preview')}
                    </button>
                </div>
                <Show
                    when={!preview()}
                    fallback={
                        <div class="package-readme-preview">
                            <Show
                                when={readme().trim()}
                                fallback={
                                    <p class="muted">
                                        {t(
                                            'editor.nothing',
                                            'Nothing to preview yet'
                                        )}
                                    </p>
                                }
                            >
                                <Markdown text={readme()} />
                            </Show>
                        </div>
                    }
                >
                    <label class="visually-hidden" for={inputId('readme')}>
                        {t('editor.readme', 'README')}
                    </label>
                    <textarea
                        id={inputId('readme')}
                        name="readme"
                        class="package-textarea"
                        classList={{ invalid: !!errors().readme?.length }}
                        placeholder={t(
                            'editor.readme_placeholder',
                            'What it does, what it needs (connections, settings), how to start it. Markdown works.'
                        )}
                        rows={10}
                        maxLength={100000}
                        disabled={busy()}
                        value={readme()}
                        onInput={(e) => setReadme(e.currentTarget.value)}
                    />
                </Show>
                <FieldError for={inputId('readme')} errors={errors().readme} />
            </div>

            <Field
                id={inputId('tags')}
                name="tags"
                label={t('editor.tags', 'Tags, separated by commas (up to 10)')}
                showLabel
                errors={errors().tags}
                type="text"
                disabled={busy()}
                value={tags()}
                onInput={(e) => setTags(e.currentTarget.value)}
            />

            <fieldset id={inputId('visibility')} class="package-visibility">
                <legend class="field-label">
                    {t('editor.visibility', 'Who sees it')}
                </legend>
                <For each={VISIBILITIES}>
                    {(option) => (
                        <label class="package-visibility-option">
                            <input
                                type="radio"
                                name="visibility"
                                value={option}
                                checked={visibility() === option}
                                disabled={busy()}
                                onChange={() => setVisibility(option)}
                            />
                            <span>
                                <strong>
                                    {t(`visibility.${option}`, option)}
                                </strong>
                                <span class="muted">
                                    {
                                        {
                                            Private: t(
                                                'visibility.Private_hint',
                                                'You and the people you share it with'
                                            ),
                                            Unlisted: t(
                                                'visibility.Unlisted_hint',
                                                'Anyone signed in who has the link'
                                            ),
                                            Public: t(
                                                'visibility.Public_hint',
                                                'Everyone, listed in Explore'
                                            ),
                                        }[option]
                                    }
                                </span>
                            </span>
                        </label>
                    )}
                </For>
                <FieldError
                    for={inputId('visibility')}
                    errors={errors().visibility}
                />
            </fieldset>

            <Show when={!props.pkg}>
                <WorkflowPicker
                    id={inputId('workflows')}
                    selected={workflows()}
                    onChange={setWorkflows}
                    disabled={busy()}
                    errors={errors().workflows}
                />
            </Show>

            <div class="package-actions">
                <Button type="submit" busy={busy()}>
                    {props.pkg
                        ? t('editor.save', 'Save')
                        : t('editor.publish', 'Publish')}
                </Button>
            </div>
        </form>
    );
}
