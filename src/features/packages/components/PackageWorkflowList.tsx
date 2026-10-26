import { createSignal, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { useAuth } from '@shared/api/auth-provider';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import type { WorkflowPackage, WorkflowSummary } from '@shared/api/types';
import { DateHelper } from '@shared/lib/date-helper';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import EmptyState from '@shared/ui/EmptyState';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Switch from '@shared/ui/Switch';
import { getWorkflow, setActive } from '@features/packages/api';
import { packagePath } from '@features/packages/package-nav';

/** A package's workflows: on or off, which handles errors. */
export default function PackageWorkflowList(props: {
    pkg: WorkflowPackage;
    workflows: WorkflowSummary[];
    loading: boolean;
    onChange: (workflow: WorkflowSummary) => void;
}) {
    const t = useLocalizer('workflows');
    const i18n = useI18n();
    const { user } = useAuth();
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
            props.onChange({ ...item, active, version: result.data.version });
        } finally {
            setBusy(null);
        }
    }

    return (
        <>
            <ErrorSummary errors={errors()} inputId={() => ''} />
            <Show
                when={props.workflows.length > 0}
                fallback={
                    <Show when={!props.loading}>
                        <EmptyState>
                            {t(
                                'package.empty',
                                'No workflows in it yet: import one from a file.'
                            )}
                        </EmptyState>
                    </Show>
                }
            >
                <ul class="workflows-list">
                    <For each={props.workflows}>
                        {(item) => (
                            <li class="workflows-item card">
                                <span class="workflows-item-main">
                                    <A
                                        href={`${packagePath(props.pkg.id)}/${item.id}`}
                                        class="workflows-item-name"
                                    >
                                        {item.name}
                                    </A>
                                    <span class="muted workflows-item-meta">
                                        <span>v{item.version}</span>
                                        <Show
                                            when={
                                                item.key ===
                                                props.pkg.errorWorkflow
                                            }
                                        >
                                            <span class="workflow-badge">
                                                {t(
                                                    'package.error_badge',
                                                    'handles errors'
                                                )}
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
        </>
    );
}
