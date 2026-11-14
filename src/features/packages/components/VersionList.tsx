import { createSignal, For, Show } from 'solid-js';
import { useQuery } from '@tanstack/solid-query';
import { createSubmit } from '@shared/api/submit';
import type { Workflow, WorkflowVersion } from '@shared/api/types';
import { useDateFormat } from '@shared/lib/date-format';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import LoadError from '@shared/ui/LoadError';
import {
    restoreWorkflowVersionMutation,
    workflowExportUrl,
    workflowVersionsQuery,
} from '@features/packages/api/workflows';

/**
 * Its saved versions, newest first: one per change of the program. An old
 * one can be exported, or restored: as a new version on top, history kept.
 * A save of the workflow (a restore here, its other editors elsewhere)
 * asks the list again.
 */
export default function VersionList(props: { workflow: Workflow }) {
    const t = useLocalizer('workflows');
    const date = useDateFormat();
    const versions = useQuery(() => workflowVersionsQuery(props.workflow.id));
    const [restoring, setRestoring] = createSignal<WorkflowVersion | null>(
        null
    );
    const { busy, errors, setErrors, mutation } = createSubmit();
    const bringBack = mutation(restoreWorkflowVersionMutation);

    // A failure (the workflow changed meanwhile) shows in the dialog, which
    // stays open.
    function restore(version: WorkflowVersion) {
        return bringBack.run(
            {
                id: props.workflow.id,
                version: version.version,
                currentVersion: props.workflow.version,
            },
            () => setRestoring(null)
        );
    }

    function cancel() {
        setRestoring(null);
        setErrors({});
    }

    return (
        <>
            <Show when={versions.isError && versions.error}>
                {(error) => (
                    <LoadError
                        error={error()}
                        busy={versions.isFetching}
                        onRetry={() => versions.refetch()}
                    />
                )}
            </Show>
            <ol class="workflow-versions">
                <For each={versions.data}>
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
