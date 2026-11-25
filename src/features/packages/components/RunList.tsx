import { createSignal, For, Show } from 'solid-js';
import { useQuery } from '@tanstack/solid-query';
import { useDateFormat } from '@shared/lib/date-format';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import { createPagedList } from '@shared/api/paged-list';
import Paginated, { paginatedItem } from '@shared/ui/Paginated';
import QueryState from '@shared/ui/QueryState';
import {
    runQuery,
    runsOfPackageInfiniteQuery,
    runsOfWorkflowInfiniteQuery,
} from '@features/packages/api/runs';
import { formatDuration, isBusy } from '@features/packages/format';
import RunStatus from './RunStatus';
import { RunErrors, RunLiveDetails, RunLiveLine } from './RunLive';

/**
 * A workflow's runs, or those of all a package's workflows (each named),
 * newest first, a page at a time; opening one shows its result (output,
 * variables, errors) while the server keeps it. Run events keep it
 * current (run-events.ts): a new run on top, a running run's step and
 * failed blocks as they come, a run done patched in place.
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
    // A run not done has no result yet: its details wait (the completed
    // event refreshes the row, and this query then asks).
    const openBusy = () =>
        runs.items().some((r) => r.runId === open() && isBusy(r.status));
    const details = useQuery(() => ({
        ...runQuery(open() ?? ''),
        enabled: open() !== null && !openBusy(),
    }));

    const toggle = (id: string) => setOpen(open() === id ? null : id);

    const date = useDateFormat();

    return (
        <Paginated
            list={runs}
            moreLabel={t('runs.more', 'Show older')}
            empty={t(
                'runs.empty',
                'No runs yet. Run it now, or turn it on for its triggers.'
            )}
        >
            {(items) => (
                <ul class="workflow-runs">
                    <For each={items()}>
                        {(run) => (
                            <li class="workflow-run" {...paginatedItem}>
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
                                    <RunErrors run={run} />
                                </button>
                                <Show when={isBusy(run.status)}>
                                    <RunLiveLine runId={run.runId} />
                                </Show>
                                <Show when={open() === run.runId}>
                                    <div class="workflow-run-details">
                                        <Show
                                            when={!isBusy(run.status)}
                                            fallback={
                                                <RunLiveDetails
                                                    runId={run.runId}
                                                />
                                            }
                                        >
                                            <QueryState
                                                query={details}
                                                loading={
                                                    <p class="muted">
                                                        {t(
                                                            'ui.loading',
                                                            'Loading…'
                                                        )}
                                                    </p>
                                                }
                                            >
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
                                            </QueryState>
                                        </Show>
                                    </div>
                                </Show>
                            </li>
                        )}
                    </For>
                </ul>
            )}
        </Paginated>
    );
}
