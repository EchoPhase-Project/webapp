import { createSignal, Show } from 'solid-js';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import type { WorkflowPackage } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Field from '@shared/ui/Field';
import FieldError from '@shared/ui/FieldError';
import Markdown from '@shared/ui/Markdown';
import Modal from '@shared/ui/Modal';
import { createPackage, inputOf, updatePackage } from '@features/packages/api';

const FIELDS = ['name', 'summary', 'readme'] as const;
const inputId = (field: string) => `package-${field}`;

/**
 * A package's name, summary and README: a new, empty (private) one, or an
 * existing one. Tags and who sees it have editors of their own.
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
                    ? t('editor.edit', 'Name, summary and README')
                    : t('editor.new', 'New package')
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
    /* eslint-enable solid/reactivity */
    const [preview, setPreview] = createSignal(false);
    const [errors, setErrors] = createSignal<FormErrors>({});
    const [busy, setBusy] = createSignal(false);

    async function save(e: Event) {
        e.preventDefault();
        if (busy()) return;
        setBusy(true);
        try {
            const about = {
                name: name(),
                summary: summary(),
                readme: readme(),
            };
            // The rest (tags, visibility, error workflow) as it is.
            const result = props.pkg
                ? await updatePackage(props.pkg.id, {
                      ...inputOf(props.pkg),
                      ...about,
                  })
                : await createPackage({ ...about, visibility: 'Private' });
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

            <div class="package-actions">
                <Button type="submit" busy={busy()}>
                    {props.pkg
                        ? t('editor.save', 'Save')
                        : t('editor.create', 'Create')}
                </Button>
            </div>
        </form>
    );
}
