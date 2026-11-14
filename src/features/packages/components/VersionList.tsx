import { createResource, createSignal, For, Show } from 'solid-js';
import { createSubmit } from '@shared/api/submit';
import type { Workflow, WorkflowVersion } from '@shared/api/types';
import { useDateFormat } from '@shared/lib/date-format';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import {
    listWorkflowVersions,
    restoreWorkflowVersion,
    workflowExportUrl,
} from '@features/packages/api';

/**
 * Its saved versions, newest first: one per change of the program. An old
 * one can be exported, or restored: as a new version on top, history kept.
 */
export default function VersionList(props: {
    workflow: Workflow;
    onRestored: (workflow: Workflow) => void;
}) {
    const t = useLocalizer('workflows');
    const date = useDateFormat();
    const [versions, { refetch }] = createResource(
        () => [props.workflow.id, props.workflow.version] as const,
        ([id]) => listWorkflowVersions(id)
    );
    const [restoring, setRestoring] = createSignal<WorkflowVersion | null>(
        null
    );
    const { busy, errors, setErrors, run } = createSubmit();

    // A failure (the workflow changed meanwhile) shows in the dialog, which
    // stays open.
    function restore(version: WorkflowVersion) {
        return run(
            () =>
                restoreWorkflowVersion(
                    props.workflow.id,
                    version.version,
                    props.workflow.version
                ),
            (workflow) => {
                setRestoring(null);
                props.onRestored(workflow);
                void refetch();
            }
        );
    }

    function cancel() {
        setRestoring(null);
        setErrors({});
    }

    return (
        <>
            <ol class="workflow-versions">
                <For each={versions()}>
                    {(v) => (
                        <li>
                            <span class="workflow-version-head">
                                <strong>v{v.version}</strong>
                                <Show
                                    when={v.version === props.workflow.version}
                                >
                                    <span class="badge">
                                        {t('versions.current', 'current')}
                                    </span>
                                </Show>
                                <span class="muted">{date(v.createdAt)}</span>
                                <Show when={v.restoredFrom}>
                                    {(from) => (
                                        <span class="muted">
                                            {t(
                                                'versions.restored',
                                                'brought back v{version}',
                                                { version: from() }
                                            )}
                                        </span>
                                    )}
                                </Show>
                            </span>
                            <span class="actions-row">
                                <a
                                    class="btn btn-ghost"
                                    href={workflowExportUrl(
                                        props.workflow.id,
                                        v.version
                                    )}
                                    download=""
                                >
                                    {t('versions.export', 'Export')}
                                </a>
                                <Show
                                    when={v.version !== props.workflow.version}
                                >
                                    <Button
                                        variant="ghost"
                                        onClick={() => setRestoring(v)}
                                    >
                                        {t('versions.restore', 'Restore')}
                                    </Button>
                                </Show>
                            </span>
                        </li>
                    )}
                </For>
            </ol>
            <ConfirmDialog
                item={restoring()}
                title={t(
                    'versions.restore_title',
                    'Restore version {version}?',
                    { version: restoring()?.version ?? '' }
                )}
                confirm={t('versions.restore', 'Restore')}
                busy={busy()}
                errors={errors()}
                onConfirm={(version) => void restore(version)}
                onCancel={cancel}
            >
                {t(
                    'versions.restore_body',
                    'Its program becomes the current one, as a new version on top; nothing is lost, the current one stays in the history.'
                )}
            </ConfirmDialog>
        </>
    );
}
