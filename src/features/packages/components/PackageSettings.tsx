import { createEffect, createSignal, For, Show } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import type { WorkflowPackage, WorkflowSummary } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import ErrorSummary from '@shared/ui/ErrorSummary';
import FieldError from '@shared/ui/FieldError';
import { deletePackage, inputOf, updatePackage } from '@features/packages/api';
import PackageEditorModal from './PackageEditorModal';
import PackageShares from './PackageShares';
import PublishModal from './PublishModal';
import TagsEditor from './TagsEditor';
import VisibilityBadge from './VisibilityBadge';
import VisibilityEditor from './VisibilityEditor';

const ERROR_FIELD = 'package-error-workflow';

/**
 * What a package is and does as a whole, each part with its own editor:
 * name and README, tags, who sees it, which workflow handles failed runs,
 * its published versions, who it is shared with; and deleting it.
 */
export default function PackageSettings(props: {
    pkg: WorkflowPackage;
    workflows: WorkflowSummary[];
    onSaved: (pkg: WorkflowPackage) => void;
}) {
    const t = useLocalizer('workflows');
    const tp = useLocalizer('packages');
    const navigate = useNavigate();
    const [editing, setEditing] = createSignal(false);
    const [publishing, setPublishing] = createSignal(false);
    const [deleting, setDeleting] = createSignal(false);
    const [busy, setBusy] = createSignal(false);
    const [errors, setErrors] = createSignal<FormErrors>({});
    // The choice starts from the package's, and follows it once saved.
    const [errorWorkflow, setErrorWorkflow] = createSignal('');
    createEffect(() => setErrorWorkflow(props.pkg.errorWorkflow ?? ''));

    async function saveErrorWorkflow(e: Event) {
        e.preventDefault();
        setBusy(true);
        try {
            const result = await updatePackage(props.pkg.id, {
                ...inputOf(props.pkg),
                errorWorkflow: errorWorkflow() || null,
            });
            if (!result.ok) {
                setErrors(groupErrors(result.errors, ['errorWorkflow']));
                return;
            }
            setErrors({});
            props.onSaved(result.data);
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        setBusy(true);
        try {
            const result = await deletePackage(props.pkg.id);
            if (result.ok) navigate('/packages');
        } finally {
            setBusy(false);
            setDeleting(false);
        }
    }

    return (
        <div class="package-settings">
            <section class="workflow-section">
                <span class="package-settings-head">
                    <h2>{t('settings.general', 'General')}</h2>
                    <Button variant="ghost" onClick={() => setEditing(true)}>
                        {t('settings.edit', 'Edit')}
                    </Button>
                </span>
                <p>
                    <strong>{props.pkg.name}</strong>
                </p>
                <p class="muted">
                    {props.pkg.summary ||
                        t('settings.no_summary', 'No summary yet.')}
                </p>
                <p class="muted">
                    {props.pkg.readme.trim()
                        ? t('settings.has_readme', 'Has a README.')
                        : t('settings.no_readme', 'No README yet.')}
                </p>
            </section>

            <section class="workflow-section">
                <h2>{t('settings.tags', 'Tags')}</h2>
                <TagsEditor pkg={props.pkg} onSaved={(p) => props.onSaved(p)} />
            </section>

            <section class="workflow-section">
                <span class="package-settings-head">
                    <h2>{t('settings.visibility', 'Visibility')}</h2>
                    <VisibilityBadge visibility={props.pkg.visibility} />
                </span>
                <VisibilityEditor
                    pkg={props.pkg}
                    onSaved={(p) => props.onSaved(p)}
                />
            </section>

            <section class="workflow-section">
                <h2>{t('settings.errors', 'When a run fails')}</h2>
                <form
                    class="package-error-form"
                    onSubmit={(e) => void saveErrorWorkflow(e)}
                    noValidate
                >
                    <ErrorSummary
                        errors={errors()}
                        inputId={() => ERROR_FIELD}
                    />
                    <label class="field-label" for={ERROR_FIELD}>
                        {t(
                            'settings.error_workflow',
                            'Workflow to start when an automatic run of one of them fails'
                        )}
                    </label>
                    <span class="package-error-row">
                        <select
                            id={ERROR_FIELD}
                            class="package-select"
                            disabled={busy()}
                            value={errorWorkflow()}
                            onChange={(e) =>
                                setErrorWorkflow(e.currentTarget.value)
                            }
                        >
                            <option value="">
                                {t('settings.no_error_workflow', 'None')}
                            </option>
                            <For each={props.workflows}>
                                {(w) => <option value={w.key}>{w.name}</option>}
                            </For>
                        </select>
                        <Button
                            type="submit"
                            variant="ghost"
                            busy={busy()}
                            disabled={
                                errorWorkflow() ===
                                (props.pkg.errorWorkflow ?? '')
                            }
                        >
                            {t('settings.save', 'Save')}
                        </Button>
                    </span>
                    <p class="muted package-hint">
                        {t(
                            'settings.error_hint',
                            'It needs an ErrorTrigger block; its input says which workflow failed and why. Runs started by hand do not count.'
                        )}
                    </p>
                    <FieldError
                        for={ERROR_FIELD}
                        errors={errors().errorWorkflow}
                    />
                </form>
            </section>

            <section class="workflow-section">
                <h2>{t('settings.publishing', 'Publishing')}</h2>
                <p class="muted">
                    <Show
                        when={props.pkg.latestVersion > 0}
                        fallback={t(
                            'settings.unpublished',
                            'Not published: only you see it. A version is what others read and install.'
                        )}
                    >
                        {t(
                            'settings.published',
                            'Published, latest v{version}.'
                        ).replace('{version}', String(props.pkg.latestVersion))}
                    </Show>
                </p>
                <span class="package-settings-actions">
                    <Button
                        disabled={props.workflows.length === 0}
                        onClick={() => setPublishing(true)}
                    >
                        {tp('publish.open', 'New version')}
                    </Button>
                    <Show when={props.pkg.latestVersion > 0}>
                        <A
                            class="btn btn-ghost"
                            href={`/explore/${props.pkg.id}`}
                        >
                            {t('settings.open_explore', 'See it as others do')}
                        </A>
                    </Show>
                </span>
            </section>

            <PackageShares packageId={props.pkg.id} />

            <section class="workflow-section">
                <h2>{t('settings.danger', 'Delete')}</h2>
                <Button
                    variant="danger-outline"
                    disabled={busy()}
                    onClick={() => setDeleting(true)}
                >
                    {t('settings.delete', 'Delete this package')}
                </Button>
            </section>

            <PackageEditorModal
                open={editing()}
                pkg={props.pkg}
                onClose={() => setEditing(false)}
                onSaved={(saved) => {
                    setEditing(false);
                    props.onSaved(saved);
                }}
            />
            <PublishModal
                open={publishing()}
                pkg={props.pkg}
                workflows={props.workflows}
                onClose={() => setPublishing(false)}
                onPublished={(v) => {
                    setPublishing(false);
                    props.onSaved({
                        ...props.pkg,
                        latestVersion: v.version,
                        updatedAt: v.createdAt,
                    });
                }}
            />
            <ConfirmDialog
                open={deleting()}
                title={t('settings.delete_title', 'Delete this package?')}
                confirm={t('delete.confirm', 'Delete')}
                busy={busy()}
                onConfirm={() => void remove()}
                onCancel={() => setDeleting(false)}
            >
                {t(
                    'settings.delete_body',
                    'Its workflows go with it, with their versions, schedules and storage; their webhooks stop answering. Its published versions go too; packages others installed from it stay theirs.'
                )}
            </ConfirmDialog>
        </div>
    );
}
