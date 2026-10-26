import {
    createEffect,
    createRenderEffect,
    createResource,
    createSignal,
    For,
    on,
    Show,
    type Component,
} from 'solid-js';
import { A, useNavigate, useSearchParams } from '@solidjs/router';
import {
    AiOutlineApartment,
    AiOutlineApi,
    AiOutlineArrowLeft,
    AiOutlineBranches,
    AiOutlineCaretRight,
    AiOutlineClockCircle,
    AiOutlineHistory,
} from 'solid-icons/ai';
import { useRootMeta } from '@shared/meta/page-meta';
import { useAuth } from '@shared/api/auth-provider';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import type { Workflow } from '@shared/api/types';
import { DateHelper } from '@shared/lib/date-helper';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import EmptyState from '@shared/ui/EmptyState';
import ErrorSummary from '@shared/ui/ErrorSummary';
import PageHeader from '@shared/ui/PageHeader';
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
    const i18n = useI18n();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams<{ edited?: string }>();
    const { setTitle, setDescription } = useRootMeta();

    const [workflow, { mutate }] = createResource(
        () => props.id,
        async (id) => {
            const result = await getWorkflow(id);
            return result.ok ? result.data : null;
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
        overview: AiOutlineApartment,
        webhooks: AiOutlineApi,
        schedules: AiOutlineClockCircle,
        runs: AiOutlineHistory,
        versions: AiOutlineBranches,
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
                      icon: AiOutlineApartment,
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
    const [busy, setBusy] = createSignal(false);
    const [errors, setErrors] = createSignal<FormErrors>({});

    createRenderEffect(() => {
        setTitle(`${workflow()?.name ?? t('title', 'Workflows')} · EchoPhase`);
        setDescription(
            t(
                'description',
                'Your workflows: what they do, their runs and versions.'
            )
        );
    });

    createEffect(
        on(
            () => props.id,
            () => setErrors({}),
            { defer: true }
        )
    );

    async function toggle(w: Workflow, active: boolean) {
        setBusy(true);
        try {
            const result = await setActive(w, active);
            if (!result.ok) {
                setErrors(groupErrors(result.errors, []));
                return;
            }
            setErrors({});
            mutate(result.data);
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        setBusy(true);
        try {
            const result = await deleteWorkflow(props.id);
            if (result.ok) {
                navigate(packagePath(props.packageId));
                return;
            }
            // Called by another workflow, or the package's error workflow.
            setErrors(groupErrors(result.errors, []));
        } finally {
            setBusy(false);
            setDeleting(false);
        }
    }

    const back = (
        <A href={packagePath(props.packageId)} class="workflow-back">
            <AiOutlineArrowLeft aria-hidden="true" />{' '}
            {pkg()?.name ?? t('back', 'Package')}
        </A>
    );

    return (
        <Show
            when={workflow()}
            fallback={
                <Show when={!workflow.loading}>
                    {back}
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
                <div class="workflow-page">
                    {back}
                    <PageHeader
                        eyebrow={t('eyebrow', 'Workflows')}
                        title={w().name}
                        meta={
                            <span class="workflow-meta">
                                <span>v{w().version}</span>
                                <span>
                                    {t('updated', 'changed {date}').replace(
                                        '{date}',
                                        DateHelper.format(
                                            w().updatedAt,
                                            user()?.timeZone,
                                            i18n.currentLocale()
                                        )
                                    )}
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
                                    {t('delete.open', 'Delete')}
                                </Button>
                                <Button onClick={() => setRunning(true)}>
                                    <AiOutlineCaretRight />
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
                    <ErrorSummary errors={errors()} inputId={() => ''} />

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

                    <nav
                        class="workflow-tabs"
                        aria-label={t('tab.label', 'Workflow')}
                    >
                        <For each={tabs()}>
                            {(name) => (
                                <A
                                    class="workflow-tab"
                                    href={path(name)}
                                    aria-current={
                                        tab() === name ? 'page' : undefined
                                    }
                                >
                                    {t(`tab.${name}`, name)}
                                </A>
                            )}
                        </For>
                    </nav>

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
                        confirm={t('delete.confirm', 'Delete')}
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
