import { createSignal, For, Match, Show, Switch } from 'solid-js';
import { useQuery } from '@tanstack/solid-query';
import { useDateFormat } from '@shared/lib/date-format';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import { createPagedList } from '@shared/lib/paged-list';
import Button from '@shared/ui/Button';
import EmptyState from '@shared/ui/EmptyState';
import LoadError from '@shared/ui/LoadError';
import {
    runQuery,
    runsOfPackageInfiniteQuery,
    runsOfWorkflowInfiniteQuery,
} from '@features/packages/api/runs';
import { formatDuration } from '@features/packages/format';
import RunStatus from './RunStatus';

/**
 * A workflow's runs, or those of all a package's workflows (each named),
 * newest first, a page at a time; opening one shows its result (output,
 * variables, errors) while the server keeps it. Run events keep it
 * current (run-events.ts): a new run on top, a run done patched in place.
 */
export default function RunList(props: {
    workflowId?: string;
    packageId?: string;
    /** For a package's runs: its workflows' names by id. */
    names?: Record<string, string>;
}) {
    const t = useLocalizer('workflows');
    const i18n = useI18n();
    const runs = createPagedList(() =>
        props.packageId
            ? runsOfPackageInfiniteQuery(props.packageId)
            : runsOfWorkflowInfiniteQuery(props.workflowId ?? '')
    );
    // The run whose details are open, and its details.
    const [open, setOpen] = createSignal<string | null>(null);
    const details = useQuery(() => ({
        ...runQuery(open() ?? ''),
        enabled: open() !== null,
    }));

    const toggle = (id: string) => setOpen(open() === id ? null : id);

    const date = useDateFormat();

    return (
        <>
            <Show when={runs.error()}>
                {(error) => (
                    <LoadError
                        error={error()}
                        busy={runs.retrying()}
                        onRetry={runs.retry}
                    />
                )}
            </Show>
            <Show
                when={runs.items().length > 0}
                fallback={
                    <Show when={runs.loaded()}>
                        <EmptyState>
                            {t(
                                'runs.empty',
                                'No runs yet. Run it now, or turn it on for its triggers.'
                            )}
                        </EmptyState>
                    </Show>
                }
            >
                <ul class="workflow-runs">
                    <For each={runs.items()}>
                        {(run) => (
                            <li class="workflow-run">
                                {/* eslint-disable-next-line no-restricted-syntax -- a whole row that opens the run's details, not an action button */}
                                <button
                                    type="button"
                                    class="workflow-run-row"
                                    aria-expanded={open() === run.runId}
                                    onClick={() => toggle(run.runId)}
                                >
                                    <RunStatus status={run.status} />
                                    <Show when={props.names}>
                                        {(names) => (
                                            <span class="workflow-run-name">
                                                {names()[
                                                    run.workflowId ?? ''
                                                ] ??
                                                    t(
                                                        'runs.deleted',
                                                        'a deleted workflow'
                                                    )}
                                            </span>
                                        )}
                                    </Show>
                                    <span class="workflow-run-trigger">
                                        {t(
                                            `trigger.${run.trigger}`,
                                            run.trigger
                                        )}
                                    </span>
                                    <span class="muted">
                                        {date(run.startedAt ?? run.createdAt)}
                                    </span>
                                    <span class="muted">
                                        {formatDuration(
                                            run.durationMs,
                                            i18n.currentLocale()
                                        )}
                                    </span>
                                    <Show when={(run.errorCount ?? 0) > 0}>
                                        <span class="workflow-run-errors">
                                            {t(
                                                'runs.errors',
                                                '{count} errors',
                                                {
                                                    count: run.errorCount ?? 0,
                                                }
                                            )}
                                        </span>
                                    </Show>
                                </button>
                                <Show when={open() === run.runId}>
                                    <div class="workflow-run-details">
                                        <Switch
                                            fallback={
                                                <p class="muted">
                                                    {t(
                                                        'ui.loading',
                                                        'Loading…'
                                                    )}
                                                </p>
                                            }
                                        >
                                            <Match
                                                when={
                                                    details.isError &&
                                                    details.error
                                                }
                                            >
                                                {(error) => (
                                                    <LoadError
                                                        error={error()}
                                                        busy={
                                                            details.isFetching
                                                        }
                                                        onRetry={() =>
                                                            details.refetch()
                                                        }
                                                    />
                                                )}
                                            </Match>
                                            <Match when={details.data}>
                                                {(d) => (
                                                    <Show
                                                        when={d().result}
                                                        fallback={
                                                            <p class="muted">
                                                                {t(
                                                                    'runs.no_result',
                                                                    'Its result is no longer kept.'
                                                                )}
                                                            </p>
                                                        }
                                                    >
                                                        <pre class="workflow-json">
                                                            {JSON.stringify(
                                                                d().result,
                                                                null,
                                                                2
                                                            )}
                                                        </pre>
                                                    </Show>
                                                )}
                                            </Match>
                                        </Switch>
                                    </div>
                                </Show>
                            </li>
                        )}
                    </For>
                </ul>
                <Show when={runs.more()}>
                    <div class="workflow-more">
                        <Button
                            variant="ghost"
                            busy={runs.loading()}
                            onClick={() => runs.loadMore()}
                        >
                            {t('runs.more', 'Show older')}
                        </Button>
                    </div>
                </Show>
            </Show>
        </>
    );
}
