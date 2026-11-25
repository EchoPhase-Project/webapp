import { createUniqueId, For, Show } from 'solid-js';
import { useQuery } from '@tanstack/solid-query';
import { useLocalizer } from '@shared/i18n/i18n-context';
import type { BlockRun } from '@shared/api/types';
import { runLiveQuery } from '@features/packages/api/runs';
import { isBusy } from '@features/packages/format';

const useLive = (runId: () => string) => useQuery(() => runLiveQuery(runId()));

/**
 * A running run's step and the block it just did, under its row. Not in the
 * row's button: the text changes several times a second, and it would
 * change the button's name each time.
 */
export function RunLiveLine(props: { runId: string }) {
    const t = useLocalizer('workflows');
    const live = useLive(() => props.runId);
    return (
        <Show when={live.data?.block}>
            {(block) => (
                <p class="muted workflow-run-live">
                    {t('runs.live.step', 'Step {steps}: {type} #{id}', {
                        steps: live.data?.steps ?? 0,
                        type: block().type,
                        id: block().id,
                    })}
                </p>
            )}
        </Show>
    );
}

/**
 * A run's error count for its row: while it runs, the blocks that failed so
 * far when they are more than the stored count (stored only when done).
 */
export function RunErrors(props: { run: BlockRun }) {
    const t = useLocalizer('workflows');
    const live = useLive(() => props.run.runId);
    const count = () => {
        const stored = props.run.errorCount ?? 0;
        return isBusy(props.run.status)
            ? Math.max(stored, live.data?.failed ?? 0)
            : stored;
    };
    return (
        <Show when={count() > 0}>
            <span class="workflow-run-errors">
                {t('runs.errors', '{count} errors', { count: count() })}
            </span>
        </Show>
    );
}

/**
 * A run that is not done: the blocks that failed so far. Its result comes
 * when it is done (the completed event fetches it).
 */
export function RunLiveDetails(props: { runId: string }) {
    const t = useLocalizer('workflows');
    const live = useLive(() => props.runId);
    const title = createUniqueId();
    return (
        <div class="workflow-run-progress">
            <p class="muted">
                {t(
                    'runs.live.pending',
                    'Not done yet: its result shows when it is done.'
                )}
            </p>
            <Show when={live.data?.failures.length}>
                <p id={title} class="workflow-run-failures-title">
                    {t('runs.live.failures', 'Failed blocks so far')}
                </p>
                <ul class="workflow-run-failures" aria-labelledby={title}>
                    <For each={live.data?.failures}>
                        {(f) => (
                            <li>
                                {t(
                                    'runs.live.failure',
                                    '#{id} {type}: {message}',
                                    {
                                        id: f.blockId,
                                        type: f.errorType,
                                        message: f.message,
                                    }
                                )}
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
        </div>
    );
}
