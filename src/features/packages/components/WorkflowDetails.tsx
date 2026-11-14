import {
    createEffect,
    createResource,
    createSignal,
    on,
    Show,
    type Component,
} from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import {
    IconApi,
    IconCaretRightFilled,
    IconClock,
    IconGitBranch,
    IconHierarchy,
    IconHistory,
} from '@shared/ui/icons';
import { usePageMeta } from '@shared/meta/page-meta';
import { dataOr } from '@shared/api/client';
import { createSubmit } from '@shared/api/submit';
import type { Workflow } from '@shared/api/types';
import { useDateFormat } from '@shared/lib/date-format';
import { useLocalizer } from '@shared/i18n/i18n-context';
import BackLink from '@shared/ui/BackLink';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import EmptyState from '@shared/ui/EmptyState';
import ErrorSummary from '@shared/ui/ErrorSummary';
import PageHeader from '@shared/ui/PageHeader';
import { NavTabs } from '@shared/ui/Tabs';
import Switch from '@shared/ui/Switch';
import {
    deleteWorkflow,
    getWorkflow,
    setActive,
    workflowExportUrl,
} from '@features/packages/api';
import {
    packagePath,
    usePackage,
    workflowPath,
    type WorkflowTab,
} from '@features/packages/package-nav';
import ProgramOverview from './ProgramOverview';
import RunDialog from './RunDialog';
import RunList from './RunList';
import ScheduleTable from './ScheduleTable';
import VersionList from './VersionList';
import WebhookTable from './WebhookTable';

const TABS: WorkflowTab[] = [
    'overview',
    'webhooks',
    'schedules',
    'runs',
    'versions',
];

/** One workflow of a package: on or off, run it, what it is, its runs and versions; export and delete. */
export default function WorkflowDetails(props: {
    id: string;
    packageId: string;
    /** Which part is shown (from the address); absent: the overview. */
    tab?: string;
}) {
    const t = useLocalizer('workflows');
    const date = useDateFormat();
    const navigate = useNavigate();
    const [params] = useSearchParams<{ edited?: string }>();

    const [workflow, { mutate }] = createResource(
        () => props.id,
        async (id) => {
            const result = await getWorkflow(id);
            return dataOr(result, null);
        }
    );
    // Webhooks only while it has a WebhookTrigger.
    const tabs = () =>
        TABS.filter(
            (name) =>
                name !== 'webhooks' || (workflow()?.webhooks.length ?? 0) > 0
        );
    const tab = (): WorkflowTab =>
        tabs().includes(props.tab as WorkflowTab)
            ? (props.tab as WorkflowTab)
            : 'overview';
    const path = (name: WorkflowTab) =>
        workflowPath(props.packageId, props.id, name);
    const icons: Record<WorkflowTab, Component> = {
        overview: IconHierarchy,
        webhooks: IconApi,
        schedules: IconClock,
        runs: IconHistory,
        versions: IconGitBranch,
    };

    const hints: Record<WorkflowTab, () => string> = {
        overview: () => t('tab_hint.overview', 'Its blocks'),
        webhooks: () => t('tab_hint.webhooks', 'Addresses that start it'),
        schedules: () => t('tab_hint.schedules', 'When it runs on its own'),
        runs: () => t('tab_hint.runs', 'What it did'),
        versions: () => t('tab_hint.versions', 'Its changes; restore one'),
    };

    // In the navigation: its own parts, then back to its package.
    const [pkg] = usePackage(
        () => props.packageId,
        () => {
            const w = workflow();
            return w
                ? {
                      icon: IconHierarchy,
                      label: w.name,
                      items: tabs().map((name) => ({
                          icon: icons[name],
                          label: t(`tab.${name}`, name),
                          description: hints[name](),
                          href: path(name),
                          end: name === 'overview',
                      })),
                  }
                : null;
        }
    );
    const [running, setRunning] = createSignal(false);
    const [deleting, setDeleting] = createSignal(false);
    const { busy, errors, setErrors, run } = createSubmit();

    usePageMeta(() => ({
        title: workflow()?.name ?? t('title', 'Workflows'),
        description: t(
            'description',
            'Your workflows: what they do, their runs and versions.'
        ),
    }));

    createEffect(
        on(
            () => props.id,
            () => setErrors({}),
            { defer: true }
        )
    );

    async function toggle(w: Workflow, active: boolean) {
        await run(
            () => setActive(w, active),
            (saved) => mutate(saved)
        );
    }

    // A failure: called by another workflow, or the package's error workflow.
    async function remove() {
        try {
            await run(
                () => deleteWorkflow(props.id),
                () => navigate(packagePath(props.packageId))
            );
        } finally {
            setDeleting(false);
        }
    }

    const back = () => (
        <BackLink
            href={packagePath(props.packageId)}
            label={pkg()?.name ?? t('back', 'Package')}
        />
    );

    return (
        <Show
            when={workflow()}
            fallback={
                <Show when={!workflow.loading}>
                    {back()}
                    <EmptyState>
                        {t(
                            'not_found',
                            'This workflow does not exist, or it is not yours.'
                        )}
                    </EmptyState>
                </Show>
            }
        >
            {(w) => (
                <div class="page-stack workflow-page">
                    {back()}
                    <PageHeader
                        eyebrow={t('eyebrow', 'Workflows')}
                        title={w().name}
                        meta={
                            <span class="workflow-meta">
                                <span>v{w().version}</span>
                                <span>
                                    {t('updated', 'changed {date}', {
                                        date: date(w().updatedAt),
                                    })}
                                </span>
                            </span>
                        }
                        actions={
                            <>
                                <a
                                    class="btn btn-ghost"
                                    href={workflowExportUrl(w().id)}
                                    download=""
                                >
                                    {t('export', 'Export')}
                                </a>
                                <Button
                                    variant="ghost-danger"
                                    disabled={busy()}
                                    onClick={() => setDeleting(true)}
                                >
                                    {t('ui.delete', 'Delete')}
                                </Button>
                                <Button onClick={() => setRunning(true)}>
                                    <IconCaretRightFilled />
                                    {t('run.open', 'Run now')}
                                </Button>
                            </>
                        }
                    />

                    <Show when={params.edited}>
                        <p class="workflow-notice" role="status">
                            {t(
                                'edited',
                                'Imported. The file was edited after it was exported: check the program before turning it on.'
                            )}
                        </p>
                    </Show>
                    <ErrorSummary errors={errors()} />

                    <div class="workflow-controls">
                        <Switch
                            checked={w().active}
                            disabled={busy()}
                            label={t('active', 'Run on triggers')}
                            description={t(
                                'active_hint',
                                'Its webhooks, schedules and events start runs. Running it by hand works either way.'
                            )}
                            onChange={(on) => void toggle(w(), on)}
                        />
                    </div>

                    <NavTabs
                        label={t('tab.label', 'Workflow')}
                        value={tab()}
                        tabs={tabs().map((name) => ({
                            value: name,
                            label: t(`tab.${name}`, name),
                            href: path(name),
                        }))}
                    />

                    <div role="tabpanel">
                        <Show when={tab() === 'overview'}>
                            <ProgramOverview workflow={w()} />
                        </Show>
                        <Show when={tab() === 'webhooks'}>
                            <WebhookTable
                                workflow={w()}
                                onChange={(changed) => mutate(changed)}
                            />
                        </Show>
                        <Show when={tab() === 'schedules'}>
                            <ScheduleTable
                                workflow={w()}
                                onChange={(changed) => mutate(changed)}
                            />
                        </Show>
                        <Show when={tab() === 'runs'}>
                            <RunList workflowId={w().id} />
                        </Show>
                        <Show when={tab() === 'versions'}>
                            <VersionList
                                workflow={w()}
                                onRestored={(restored) => mutate(restored)}
                            />
                        </Show>
                    </div>

                    <RunDialog
                        workflowId={w().id}
                        open={running()}
                        onClose={() => setRunning(false)}
                        onStarted={() => {
                            setRunning(false);
                            navigate(path('runs'));
                        }}
                    />
                    <ConfirmDialog
                        open={deleting()}
                        title={t('delete.title', 'Delete this workflow?')}
                        confirm={t('ui.delete', 'Delete')}
                        busy={busy()}
                        onConfirm={() => void remove()}
                        onCancel={() => setDeleting(false)}
                    >
                        {t(
                            'delete.body',
                            'Its versions and schedules go with it; its webhooks stop answering. Past runs stay until they expire.'
                        )}
                    </ConfirmDialog>
                </div>
            )}
        </Show>
    );
}
