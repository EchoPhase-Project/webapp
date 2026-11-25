import { For, Show } from 'solid-js';
import { useQuery } from '@tanstack/solid-query';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { runLiveQuery } from '@features/packages/api/runs';

/** A running run's step and the block it just did, for its row. */
export function RunLiveLine(props: { runId: string }) {
    const t = useLocalizer('workflows');
    const live = useQuery(() => runLiveQuery(props.runId));
    return (
        <Show when={live.data}>
            {(l) => (
                <span class="muted workflow-run-live">
                    <Show
                        when={l().block}
                        fallback={t('runs.live.steps', 'Step {steps}', {
                            steps: l().steps,
                        })}
                    >
                        {(block) =>
                            t('runs.live.step', 'Step {steps}: {type} #{id}', {
                                steps: l().steps,
                                type: block().type,
                                id: block().id,
                            })
                        }
                    </Show>
                </span>
            )}
        </Show>
    );
}

/**
 * A running run's details: how far it is and the blocks that failed so far.
 * Its result comes when it is done (the completed event fetches it).
 */
export function RunLiveDetails(props: { runId: string }) {
    const t = useLocalizer('workflows');
    const live = useQuery(() => runLiveQuery(props.runId));
    return (
        <div class="workflow-run-progress">
            <p class="muted">
                {t(
                    'runs.live.running',
                    'Still running: its result shows when it is done.'
                )}
            </p>
            <Show when={live.data?.failures.length}>
                <h3 class="workflow-run-failures-title">
                    {t('runs.live.failures', 'Failed blocks so far')}
                </h3>
                <ul class="workflow-run-failures">
                    <For each={live.data?.failures}>
                        {(f) => (
                            <li>
                                <code>#{f.blockId}</code> {f.errorType}:{' '}
                                {f.message}
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
        </div>
    );
}
