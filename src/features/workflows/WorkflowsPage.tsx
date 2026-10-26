import {
    createRenderEffect,
    createResource,
    createSignal,
    For,
    Show,
} from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { useRootMeta } from '@shared/meta/page-meta';
import { useAuth } from '@shared/api/auth-provider';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import type { WorkflowSummary } from '@shared/api/types';
import { DateHelper } from '@shared/lib/date-helper';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import EmptyState from '@shared/ui/EmptyState';
import ErrorSummary from '@shared/ui/ErrorSummary';
import FilePicker from '@shared/ui/FilePicker';
import PageHeader from '@shared/ui/PageHeader';
import Switch from '@shared/ui/Switch';
import { getWorkflow, importWorkflow, listWorkflows, setActive } from './api';
import './workflows.scss';

/** The user's workflows: on or off, where they came from; import one from a file. */
export default function WorkflowsPage() {
    const { setTitle, setDescription } = useRootMeta();
    const { isAuthenticated, user } = useAuth();
    const t = useLocalizer('workflows');
    const i18n = useI18n();
    const navigate = useNavigate();

    createRenderEffect(() => {
        setTitle(`${t('title', 'Workflows')} · EchoPhase`);
        setDescription(
            t(
                'description',
                'Your workflows: what they do, their runs and versions.'
            )
        );
    });

    const [workflows, { mutate }] = createResource(
        () => isAuthenticated() || false,
        listWorkflows
    );
    const [errors, setErrors] = createSignal<FormErrors>({});
    const [busy, setBusy] = createSignal<string | null>(null);

    // The list has no programs: the switch fetches the workflow, then saves it.
    async function toggle(item: WorkflowSummary, active: boolean) {
        setBusy(item.id);
        try {
            const current = await getWorkflow(item.id);
            const result = current.ok
                ? await setActive(current.data, active)
                : current;
            if (!result.ok) {
                setErrors(groupErrors(result.errors, []));
                return;
            }
            setErrors({});
            mutate((list) =>
                (list ?? []).map((w) =>
                    w.id === item.id
                        ? { ...w, active, version: result.data.version }
                        : w
                )
            );
        } finally {
            setBusy(null);
        }
    }

    async function upload(file: File) {
        setBusy('import');
        try {
            const result = await importWorkflow(file);
            if (!result.ok) {
                setErrors(groupErrors(result.errors, []));
                return;
            }
            navigate(
                `/workflows/${result.data.workflow.id}${result.data.intact ? '' : '?edited=1'}`
            );
        } finally {
            setBusy(null);
        }
    }

    return (
        <div class="workflows-container">
            <PageHeader
                eyebrow={t('eyebrow', 'Workflows')}
                title={t('title', 'Workflows')}
                description={t(
                    'lead',
                    'Programs of blocks that run by hand, on a schedule, on a webhook or on an event. Turn one on to let its triggers start it.'
                )}
                actions={
                    <FilePicker
                        accept="application/json,.json"
                        busy={busy() === 'import'}
                        onPick={(f) => void upload(f)}
                    >
                        {t('import', 'Import a file')}
                    </FilePicker>
                }
            />
            <ErrorSummary errors={errors()} inputId={() => ''} />

            <Show
                when={(workflows() ?? []).length > 0}
                fallback={
                    <Show when={!workflows.loading}>
                        <EmptyState
                            action={
                                <A class="btn" href="/explore">
                                    {t('empty_explore', 'Find one in Explore')}
                                </A>
                            }
                        >
                            {t(
                                'empty',
                                'No workflows yet: install one from Explore or import a file.'
                            )}
                        </EmptyState>
                    </Show>
                }
            >
                <ul class="workflows-list">
                    <For each={workflows()}>
                        {(item) => (
                            <li class="workflows-item card">
                                <span class="workflows-item-main">
                                    <A
                                        href={`/workflows/${item.id}`}
                                        class="workflows-item-name"
                                    >
                                        {item.name}
                                    </A>
                                    <span class="muted workflows-item-meta">
                                        <span>v{item.version}</span>
                                        <Show when={item.source}>
                                            <span class="workflow-badge">
                                                {t('installed', 'installed')}
                                            </span>
                                        </Show>
                                        <span>
                                            {DateHelper.format(
                                                item.updatedAt,
                                                user()?.timeZone,
                                                i18n.currentLocale()
                                            )}
                                        </span>
                                    </span>
                                </span>
                                <Switch
                                    checked={item.active}
                                    disabled={busy() === item.id}
                                    label={t('active', 'Run on triggers')}
                                    onChange={(on) => void toggle(item, on)}
                                />
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
        </div>
    );
}
