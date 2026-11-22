import { Show } from 'solid-js';
import type { WorkflowPackage } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import Field from '@shared/ui/forms/Field';
import { createForm } from '@shared/ui/forms/form';
import MarkdownEditor from '@shared/ui/MarkdownEditor';
import Modal from '@shared/ui/Modal';
import {
    createPackageMutation,
    updatePackageMutation,
} from '@features/packages/api/packages';

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
    const form = createForm({
        id: 'package',
        initial: () => ({
            name: props.pkg?.name ?? '',
            summary: props.pkg?.summary ?? '',
            readme: props.pkg?.readme ?? '',
        }),
    });
    const creating = form.mutation(createPackageMutation);
    const updating = form.mutation(updatePackageMutation);

    const save = form.onSubmit((about) => {
        const pkg = props.pkg;
        const onSaved = (saved: WorkflowPackage) => props.onSaved(saved);
        // The rest (tags, visibility, error workflow) as it is.
        return pkg
            ? updating.run({ pkg, patch: about }, onSaved)
            : creating.run({ ...about, visibility: 'Private' }, onSaved);
    });

    return (
        <form class="vert-form package-editor" onSubmit={save} noValidate>
            <ErrorSummary {...form.summary} />
            <Field
                {...form.input('name')}
                label={t('ui.name', 'Name')}
                showLabel
                type="text"
                maxLength={100}
            />
            <Field
                {...form.input('summary')}
                label={t(
                    'editor.summary',
                    'Summary: a sentence or two for its card'
                )}
                showLabel
                type="text"
                maxLength={300}
            />

            <MarkdownEditor
                {...form.control('readme')}
                label={t('editor.readme', 'README')}
                showLabel
                placeholder={t(
                    'editor.readme_placeholder',
                    'What it does, what it needs (connections, settings), how to start it. Markdown works.'
                )}
                rows={10}
                maxLength={100000}
            />

            <div class="actions-row actions-row--end">
                <Button type="submit" busy={form.busy()}>
                    {props.pkg
                        ? t('ui.save', 'Save')
                        : t('editor.create', 'Create')}
                </Button>
            </div>
        </form>
    );
}
