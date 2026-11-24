import { For, Show } from 'solid-js';
import { useQuery } from '@tanstack/solid-query';
import type { Workflow, WorkflowVersion } from '@shared/api/types';
import { useDateFormat } from '@shared/lib/date-format';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button, { LinkButton } from '@shared/ui/Button';
import ConfirmDialog, { createConfirm } from '@shared/ui/ConfirmDialog';
import QueryState from '@shared/ui/QueryState';
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
    // A failure (the workflow changed meanwhile) shows in the dialog, which
    // stays open.
    const restore = createConfirm(
        restoreWorkflowVersionMutation,
        (version: WorkflowVersion) => ({
            id: props.workflow.id,
            version: version.version,
            currentVersion: props.workflow.version,
        })
    );

    return (
        <>
            <QueryState query={versions}>
                {(list) => (
                    <ol class="workflow-versions">
                        <For each={list()}>
                            {(v) => (
                                <li>
                                    <span class="workflow-version-head">
                                        <strong>v{v.version}</strong>
                                        <Show
                                            when={
                                                v.version ===
                                                props.workflow.version
                                            }
                                        >
                                            <span class="badge">
                                                {t(
                                                    'versions.current',
                                                    'current'
                                                )}
                                            </span>
                                        </Show>
                                        <span class="muted">
                                            {date(v.createdAt)}
                                        </span>
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
                                        <LinkButton
                                            variant="ghost"
                                            href={workflowExportUrl(
                                                props.workflow.id,
                                                v.version
                                            )}
                                            download=""
                                        >
                                            {t('versions.export', 'Export')}
                                        </LinkButton>
                                        <Show
                                            when={
                                                v.version !==
                                                props.workflow.version
                                            }
                                        >
                                            <Button
                                                variant="ghost"
                                                onClick={() => restore.ask(v)}
                                            >
                                                {t(
                                                    'versions.restore',
                                                    'Restore'
                                                )}
                                            </Button>
                                        </Show>
                                    </span>
                                </li>
                            )}
                        </For>
                    </ol>
                )}
            </QueryState>
            <ConfirmDialog
                {...restore.dialog}
                title={t(
                    'versions.restore_title',
                    'Restore version {version}?',
                    { version: restore.item()?.version ?? '' }
                )}
                confirm={t('versions.restore', 'Restore')}
            >
                {t(
                    'versions.restore_body',
                    'Its program becomes the current one, as a new version on top; nothing is lost, the current one stays in the history.'
                )}
            </ConfirmDialog>
        </>
    );
}
