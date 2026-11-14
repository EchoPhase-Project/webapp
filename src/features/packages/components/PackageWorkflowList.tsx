import { For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { createSubmit } from '@shared/api/submit';
import type { WorkflowPackage, WorkflowSummary } from '@shared/api/types';
import { useDateFormat } from '@shared/lib/date-format';
import { useLocalizer } from '@shared/i18n/i18n-context';
import EmptyState from '@shared/ui/EmptyState';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Switch from '@shared/ui/Switch';
import { switchWorkflowMutation } from '@features/packages/api/workflows';
import { packagePath } from '@features/packages/package-nav';

/**
 * A package's workflows: on or off, which handles errors. A switch that
 * fails shows why in its own row.
 */
export default function PackageWorkflowList(props: {
    pkg: WorkflowPackage;
    workflows: WorkflowSummary[];
    loading: boolean;
}) {
    const t = useLocalizer('workflows');
    const date = useDateFormat();
    const { busy, errors, mutation } = createSubmit();
    const switching = mutation(switchWorkflowMutation);

    // The list has no programs: the switch reads the workflow anew, then
    // saves it. Each row saves on its own: the other switches stay usable.
    function toggle(item: WorkflowSummary, active: boolean) {
        return switching.runFor(item.id, { id: item.id, active });
    }

    return (
        <>
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
                                            <span class="badge">
                                                {t(
                                                    'package.error_badge',
                                                    'handles errors'
                                                )}
                                            </span>
                                        </Show>
                                        <span>{date(item.updatedAt)}</span>
                                    </span>
                                </span>
                                <Switch
                                    checked={item.active}
                                    disabled={busy(item.id)}
                                    label={t('active', 'Run on triggers')}
                                    onChange={(on) => void toggle(item, on)}
                                />
                                <Show
                                    when={
                                        Object.keys(errors(item.id)).length > 0
                                    }
                                >
                                    <div class="workflows-item-errors">
                                        <ErrorSummary
                                            errors={errors(item.id)}
                                        />
                                    </div>
                                </Show>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
        </>
    );
}
