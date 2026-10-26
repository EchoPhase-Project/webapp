import { createResource, createSignal, For, Show } from 'solid-js';
import { useAuth } from '@shared/api/auth-provider';
import type { Workflow, WorkflowVersion } from '@shared/api/types';
import { DateHelper } from '@shared/lib/date-helper';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import {
    exportUrl,
    listVersions,
    restoreVersion,
} from '@features/workflows/api';

/**
 * Its saved versions, newest first: one per change of the program. An old
 * one can be exported, or restored: as a new version on top, history kept.
 */
export default function VersionList(props: {
    workflow: Workflow;
    onRestored: (workflow: Workflow) => void;
}) {
    const t = useLocalizer('workflows');
    const i18n = useI18n();
    const { user } = useAuth();
    const [versions, { refetch }] = createResource(
        () => [props.workflow.id, props.workflow.version] as const,
        ([id]) => listVersions(id)
    );
    const [restoring, setRestoring] = createSignal<WorkflowVersion | null>(
        null
    );
    const [busy, setBusy] = createSignal(false);

    async function restore() {
        const version = restoring();
        if (!version) return;
        setBusy(true);
        try {
            const result = await restoreVersion(
                props.workflow.id,
                version.version,
                props.workflow.version
            );
            if (result.ok) {
                props.onRestored(result.data);
                void refetch();
            }
        } finally {
            setBusy(false);
            setRestoring(null);
        }
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
                                    <span class="workflow-badge">
                                        {t('versions.current', 'current')}
                                    </span>
                                </Show>
                                <span class="muted">
                                    {DateHelper.format(
                                        v.createdAt,
                                        user()?.timeZone,
                                        i18n.currentLocale()
                                    )}
                                </span>
                                <Show when={v.restoredFrom}>
                                    {(from) => (
                                        <span class="muted">
                                            {t(
                                                'versions.restored',
                                                'brought back v{version}'
                                            ).replace(
                                                '{version}',
                                                String(from())
                                            )}
                                        </span>
                                    )}
                                </Show>
                            </span>
                            <span class="workflow-version-actions">
                                <a
                                    class="btn btn-ghost"
                                    href={exportUrl(
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
                open={restoring() !== null}
                title={t(
                    'versions.restore_title',
                    'Restore version {version}?'
                ).replace('{version}', String(restoring()?.version ?? ''))}
                confirm={t('versions.restore', 'Restore')}
                busy={busy()}
                onConfirm={() => void restore()}
                onCancel={() => setRestoring(null)}
            >
                {t(
                    'versions.restore_body',
                    'Its program becomes the current one, as a new version on top; nothing is lost, the current one stays in the history.'
                )}
            </ConfirmDialog>
        </>
    );
}
