import { createSignal, Show } from 'solid-js';
import { createSubmit } from '@shared/api/submit';
import type { WorkflowPackage } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Field from '@shared/ui/Field';
import MarkdownEditor from '@shared/ui/MarkdownEditor';
import Modal from '@shared/ui/Modal';
import { createPackage, savePackage } from '@features/packages/api';

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
                    : t('ui.new_package', 'New package')
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
    const { busy, errors, run } = createSubmit(FIELDS);

    async function save(e: Event) {
        e.preventDefault();
        if (busy()) return;
        const about = {
            name: name(),
            summary: summary(),
            readme: readme(),
        };
        const pkg = props.pkg;
        await run(
            () =>
                // The rest (tags, visibility, error workflow) as it is.
                pkg
                    ? savePackage(pkg, about)
                    : createPackage({ ...about, visibility: 'Private' }),
            (saved) => props.onSaved(saved)
        );
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
                label={t('ui.name', 'Name')}
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

            <MarkdownEditor
                id={inputId('readme')}
                name="readme"
                label={t('editor.readme', 'README')}
                showLabel
                errors={errors().readme}
                placeholder={t(
                    'editor.readme_placeholder',
                    'What it does, what it needs (connections, settings), how to start it. Markdown works.'
                )}
                rows={10}
                maxLength={100000}
                disabled={busy()}
                value={readme()}
                onInput={setReadme}
            />

            <div class="actions-row actions-row--end">
                <Button type="submit" busy={busy()}>
                    {props.pkg
                        ? t('ui.save', 'Save')
                        : t('editor.create', 'Create')}
                </Button>
            </div>
        </form>
    );
}
