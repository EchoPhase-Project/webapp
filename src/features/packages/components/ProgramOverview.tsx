import { For, Show } from 'solid-js';
import type { Workflow } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';

/** What a workflow is: its blocks in order (its triggers have tabs of their own). */
export default function ProgramOverview(props: { workflow: Workflow }) {
    const t = useLocalizer('workflows');

    return (
        <div class="workflow-overview">
            <section class="workflow-section">
                <h2>
                    {t('overview.blocks', 'Blocks ({count})').replace(
                        '{count}',
                        String(props.workflow.program.blocks.length)
                    )}
                </h2>
                <ol class="workflow-blocks">
                    <For each={props.workflow.program.blocks}>
                        {(block) => (
                            <li
                                classList={{
                                    'workflow-block--off': !!block.disabled,
                                }}
                            >
                                <span class="workflow-block-id">
                                    #{block.id}
                                </span>
                                <span class="workflow-block-type">
                                    {block.type}
                                </span>
                                <Show when={block.name}>
                                    <span class="muted">{block.name}</span>
                                </Show>
                                <Show when={block.disabled}>
                                    <span class="muted">
                                        {t('overview.disabled', 'skipped')}
                                    </span>
                                </Show>
                            </li>
                        )}
                    </For>
                </ol>
            </section>
        </div>
    );
}
