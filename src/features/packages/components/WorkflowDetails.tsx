import {
    createEffect,
    createSignal,
    Match,
    on,
    Show,
    Switch as Branch,
    type Component,
} from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { useQuery } from '@tanstack/solid-query';
import {
    IconApi,
    IconCaretRightFilled,
    IconClock,
    IconGitBranch,
    IconHierarchy,
    IconHistory,
} from '@shared/ui/icons';
import { usePageMeta } from '@shared/meta/page-meta';
import { isNotFound } from '@shared/api/client';
import { createSubmit } from '@shared/api/submit';
import type { Workflow } from '@shared/api/types';
import { useDateFormat } from '@shared/lib/date-format';
import { useLocalizer } from '@shared/i18n/i18n-context';
import BackLink from '@shared/ui/BackLink';
import Button from '@shared/ui/Button';
import ConfirmDialog, { createConfirm } from '@shared/ui/ConfirmDialog';
import EmptyState from '@shared/ui/EmptyState';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import LoadError from '@shared/ui/LoadError';
import PageHeader from '@shared/ui/PageHeader';
import { NavTabs } from '@shared/ui/Tabs';
import Switch from '@shared/ui/Switch';
import {
    deleteWorkflowMutation,
    updateWorkflowMutation,
    workflowExportUrl,
    workflowQuery,
} from '@features/packages/api/workflows';
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

    const workflow = useQuery(() => workflowQuery(props.id));
    // Webhooks only while it has a WebhookTrigger.
    const tabs = () =>
        TABS.filter(
            (name) =>
                name !== 'webhooks' || (workflow.data?.webhooks.length ?? 0) > 0
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
    const pkg = usePackage(
        () => props.packageId,
        () => {
            const w = workflow.data;
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
    const { busy, errors, setErrors, mutation } = createSubmit();
    const updating = mutation(updateWorkflowMutation);
    // A failure (called by another workflow, or the package's error
    // workflow) shows in the dialog, which stays open.
    const removal = createConfirm(
        deleteWorkflowMutation,
        (w: Workflow) => ({ id: w.id, packageId: props.packageId }),
        () => navigate(packagePath(props.packageId))
    );

    usePageMeta(() => ({
        title: workflow.data?.name ?? t('title', 'Workflows'),
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
        await updating.run({ workflow: w, changes: { active } });
    }

    const back = () => (
        <BackLink
            href={packagePath(props.packageId)}
            label={pkg.data?.name ?? t('back', 'Package')}
        />
    );

    return (
        <Branch
            fallback={
                <>
                    {back()}
                    <EmptyState>
                        {t(
                            'not_found',
                            'This workflow does not exist, or it is not yours.'
                        )}
                    </EmptyState>
                </>
            }
        >
            <Match when={workflow.data}>
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
                                        disabled={busy() || removal.busy()}
                                        onClick={() => removal.ask(w())}
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
                                disabled={busy() || removal.busy()}
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
                                <WebhookTable workflow={w()} />
                            </Show>
                            <Show when={tab() === 'schedules'}>
                                <ScheduleTable workflow={w()} />
                            </Show>
                            <Show when={tab() === 'runs'}>
                                <RunList workflowId={w().id} />
                            </Show>
                            <Show when={tab() === 'versions'}>
                                <VersionList workflow={w()} />
                            </Show>
                        </div>

                        <RunDialog
                            workflowId={w().id}
                            packageId={props.packageId}
                            open={running()}
                            onClose={() => setRunning(false)}
                            onStarted={() => {
                                setRunning(false);
                                navigate(path('runs'));
                            }}
                        />
                        <ConfirmDialog
                            {...removal.dialog}
                            title={t('delete.title', 'Delete this workflow?')}
                            confirm={t('ui.delete', 'Delete')}
                        >
                            {t(
                                'delete.body',
                                'Its versions and schedules go with it; its webhooks stop answering. Past runs stay until they expire.'
                            )}
                        </ConfirmDialog>
                    </div>
                )}
            </Match>
            <Match when={workflow.isPending}>{null}</Match>
            <Match
                when={
                    workflow.isError &&
                    !isNotFound(workflow.error) &&
                    workflow.error
                }
            >
                {(error) => (
                    <div class="page-stack">
                        {back()}
                        <LoadError
                            error={error()}
                            busy={workflow.isFetching}
                            onRetry={() => workflow.refetch()}
                        />
                    </div>
                )}
            </Match>
        </Branch>
    );
}
