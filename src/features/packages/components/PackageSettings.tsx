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
import SettingsCard from './SettingsCard';
import TagsEditor from './TagsEditor';
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

    const docs = (
        <A class="page-more" href="/docs/packages">
            {t('settings.more', 'Read more')}
        </A>
    );

    return (
        <div class="package-settings">
            <SettingsCard
                title={t('settings.general', 'General')}
                description={t(
                    'settings.general_hint',
                    'Its name, summary and README, as others read them.'
                )}
                actions={
                    <Button variant="ghost" onClick={() => setEditing(true)}>
                        {t('settings.edit', 'Edit')}
                    </Button>
                }
            >
                <p>
                    <strong>{props.pkg.name}</strong>
                    <span class="muted">
                        {' · '}
                        {props.pkg.summary ||
                            t('settings.no_summary', 'No summary yet.')}
                    </span>
                </p>
                <p class="muted">
                    {props.pkg.readme.trim()
                        ? t('settings.has_readme', 'Has a README.')
                        : t('settings.no_readme', 'No README yet.')}
                </p>
            </SettingsCard>

            <TagsEditor pkg={props.pkg} onSaved={(p) => props.onSaved(p)} />

            <VisibilityEditor
                pkg={props.pkg}
                onSaved={(p) => props.onSaved(p)}
            />

            <SettingsCard
                title={t('settings.errors', 'When a run fails')}
                description={t(
                    'settings.errors_hint',
                    'The workflow started when an automatic run fails.'
                )}
                onSubmit={(e) => void saveErrorWorkflow(e)}
                hint={
                    <>
                        {t('settings.error_needs', 'It needs an ErrorTrigger.')}{' '}
                        {docs}
                    </>
                }
                actions={
                    <Button
                        type="submit"
                        variant="ghost"
                        busy={busy()}
                        disabled={
                            errorWorkflow() === (props.pkg.errorWorkflow ?? '')
                        }
                    >
                        {t('settings.save', 'Save')}
                    </Button>
                }
            >
                <ErrorSummary errors={errors()} inputId={() => ERROR_FIELD} />
                <label class="visually-hidden" for={ERROR_FIELD}>
                    {t('settings.errors', 'When a run fails')}
                </label>
                <select
                    id={ERROR_FIELD}
                    class="package-select"
                    disabled={busy()}
                    value={errorWorkflow()}
                    onChange={(e) => setErrorWorkflow(e.currentTarget.value)}
                >
                    <option value="">
                        {t('settings.no_error_workflow', 'None')}
                    </option>
                    <For each={props.workflows}>
                        {(w) => <option value={w.key}>{w.name}</option>}
                    </For>
                </select>
                <FieldError for={ERROR_FIELD} errors={errors().errorWorkflow} />
            </SettingsCard>

            <SettingsCard
                title={t('settings.publishing', 'Publishing')}
                description={
                    props.pkg.latestVersion > 0
                        ? t(
                              'settings.published',
                              'Published, latest v{version}.'
                          ).replace(
                              '{version}',
                              String(props.pkg.latestVersion)
                          )
                        : t(
                              'settings.unpublished',
                              'Not published: only you see it.'
                          )
                }
                hint={
                    <Show when={props.pkg.latestVersion > 0} fallback={docs}>
                        <A href={`/explore/${props.pkg.id}`}>
                            {t('settings.open_explore', 'See it as others do')}
                        </A>
                    </Show>
                }
                actions={
                    <Button
                        disabled={props.workflows.length === 0}
                        onClick={() => setPublishing(true)}
                    >
                        {tp('publish.open', 'New version')}
                    </Button>
                }
            />

            <PackageShares packageId={props.pkg.id} />

            <SettingsCard
                danger
                title={t('settings.danger', 'Delete')}
                description={t(
                    'settings.delete_hint',
                    'Its workflows, versions and storage go with it.'
                )}
                actions={
                    <Button
                        variant="danger-outline"
                        disabled={busy()}
                        onClick={() => setDeleting(true)}
                    >
                        {t('settings.delete', 'Delete this package')}
                    </Button>
                }
            />

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
