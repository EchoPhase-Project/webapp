import { createEffect, createSignal, For, on, Show } from 'solid-js';
import { useAuth } from '@shared/api/auth-provider';
import type { BlockRun, BlockRunDetails } from '@shared/api/types';
import { DateHelper } from '@shared/lib/date-helper';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import EmptyState from '@shared/ui/EmptyState';
import { getRun, listRuns } from '@features/workflows/api';
import { formatDuration } from '@features/workflows/format';
import { runsVersion } from '@features/workflows/run-changes';
import RunStatus from './RunStatus';

/**
 * A workflow's runs, newest first, a page at a time; opening one shows its
 * result (output, variables, errors) while the server keeps it. Fetched
 * again when a run starts or ends.
 */
export default function RunList(props: { workflowId: string }) {
    const t = useLocalizer('workflows');
    const i18n = useI18n();
    const { user } = useAuth();
    const [runs, setRuns] = createSignal<BlockRun[]>([]);
    const [next, setNext] = createSignal<string | null>(null);
    const [loaded, setLoaded] = createSignal(false);
    const [busy, setBusy] = createSignal(false);
    const [open, setOpen] = createSignal<string | null>(null);
    const [details, setDetails] = createSignal<BlockRunDetails | null>(null);

    async function load(more: boolean) {
        setBusy(true);
        try {
            const result = await listRuns(
                props.workflowId,
                more ? (next() ?? undefined) : undefined
            );
            if (!result.ok) return;
            setRuns((list) =>
                more ? [...list, ...result.data.data] : result.data.data
            );
            setNext(result.data.nextCursor ?? null);
            setLoaded(true);
        } finally {
            setBusy(false);
        }
    }

    createEffect(
        on(
            () => [props.workflowId, runsVersion()],
            () => void load(false)
        )
    );

    async function toggle(run: BlockRun) {
        if (open() === run.runId) {
            setOpen(null);
            return;
        }
        setOpen(run.runId);
        setDetails(null);
        const result = await getRun(run.runId);
        if (result.ok && open() === run.runId) setDetails(result.data);
    }

    const date = (iso: string | null | undefined) =>
        DateHelper.format(iso, user()?.timeZone, i18n.currentLocale());

    return (
        <Show
            when={runs().length > 0}
            fallback={
                <Show when={loaded()}>
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
                <For each={runs()}>
                    {(run) => (
                        <li class="workflow-run">
                            <button
                                type="button"
                                class="workflow-run-row"
                                aria-expanded={open() === run.runId}
                                onClick={() => void toggle(run)}
                            >
                                <RunStatus status={run.status} />
                                <span class="workflow-run-trigger">
                                    {t(`trigger.${run.trigger}`, run.trigger)}
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
                                            '{count} errors'
                                        ).replace(
                                            '{count}',
                                            String(run.errorCount)
                                        )}
                                    </span>
                                </Show>
                            </button>
                            <Show when={open() === run.runId}>
                                <div class="workflow-run-details">
                                    <Show
                                        when={details()}
                                        fallback={
                                            <p class="muted">
                                                {t('runs.loading', 'Loading…')}
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
                                    </Show>
                                </div>
                            </Show>
                        </li>
                    )}
                </For>
            </ul>
            <Show when={next()}>
                <div class="workflow-more">
                    <Button
                        variant="ghost"
                        busy={busy()}
                        onClick={() => void load(true)}
                    >
                        {t('runs.more', 'Show older')}
                    </Button>
                </div>
            </Show>
        </Show>
    );
}
