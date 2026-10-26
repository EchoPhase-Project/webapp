import {
    createEffect,
    createRenderEffect,
    createResource,
    createSignal,
    For,
    on,
    Show,
} from 'solid-js';
import { A, useNavigate, useSearchParams } from '@solidjs/router';
import { AiOutlineArrowLeft, AiOutlineCaretRight } from 'solid-icons/ai';
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
import { packagePath, usePackage } from '@features/packages/package-nav';
import ProgramOverview from './ProgramOverview';
import RunDialog from './RunDialog';
import RunList from './RunList';
import VersionList from './VersionList';

type Tab = 'overview' | 'runs' | 'versions';
const TABS: Tab[] = ['overview', 'runs', 'versions'];

/** One workflow of a package: on or off, run it, what it is, its runs and versions; export and delete. */
export default function WorkflowDetails(props: {
    id: string;
    packageId: string;
}) {
    const t = useLocalizer('workflows');
    const i18n = useI18n();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams<{
        tab?: string;
        edited?: string;
    }>();
    const { setTitle, setDescription } = useRootMeta();
    const [pkg] = usePackage(() => props.packageId);

    const [workflow, { mutate }] = createResource(
        () => props.id,
        async (id) => {
            const result = await getWorkflow(id);
            return result.ok ? result.data : null;
        }
    );
    const tab = (): Tab =>
        TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'overview';
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
                            <Button onClick={() => setRunning(true)}>
                                <AiOutlineCaretRight />
                                {t('run.open', 'Run now')}
                            </Button>
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
                        <span class="workflow-controls-actions">
                            <a
                                class="btn btn-ghost"
                                href={workflowExportUrl(w().id)}
                                download=""
                            >
                                {t('export', 'Export')}
                            </a>
                            <Button
                                variant="danger-outline"
                                disabled={busy()}
                                onClick={() => setDeleting(true)}
                            >
                                {t('delete.open', 'Delete')}
                            </Button>
                        </span>
                    </div>

                    <div class="workflow-tabs" role="tablist">
                        <For each={TABS}>
                            {(name) => (
                                <button
                                    type="button"
                                    role="tab"
                                    class="workflow-tab"
                                    aria-selected={tab() === name}
                                    onClick={() =>
                                        setParams({
                                            tab:
                                                name === 'overview'
                                                    ? undefined
                                                    : name,
                                        })
                                    }
                                >
                                    {t(`tab.${name}`, name)}
                                </button>
                            )}
                        </For>
                    </div>

                    <div role="tabpanel">
                        <Show when={tab() === 'overview'}>
                            <ProgramOverview
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
                            setParams({ tab: 'runs' });
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
