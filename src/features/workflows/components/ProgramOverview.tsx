import { createSignal, For, Show } from 'solid-js';
import { AiOutlineCopy } from 'solid-icons/ai';
import { useAuth } from '@shared/api/auth-provider';
import type { Workflow } from '@shared/api/types';
import { DateHelper } from '@shared/lib/date-helper';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';

/**
 * What a workflow is, read-only: its blocks in order, where its webhooks
 * listen (copyable) and when its schedules fire next.
 */
export default function ProgramOverview(props: { workflow: Workflow }) {
    const t = useLocalizer('workflows');
    const i18n = useI18n();
    const { user } = useAuth();
    const [copied, setCopied] = createSignal<number | null>(null);

    const url = (path: string) => `${location.origin}${path}`;
    async function copy(blockId: number, path: string) {
        try {
            await navigator.clipboard.writeText(url(path));
            setCopied(blockId);
        } catch {
            // No clipboard (insecure context): the address is shown to select.
        }
    }

    return (
        <div class="workflow-overview">
            <Show when={props.workflow.webhooks.length > 0}>
                <section class="workflow-section">
                    <h2>{t('overview.webhooks', 'Webhooks')}</h2>
                    <p class="muted">
                        {t(
                            'overview.webhooks_hint',
                            'POST to the address with the X-Webhook-Secret header set to the block’s secret.'
                        )}
                    </p>
                    <ul class="workflow-list">
                        <For each={props.workflow.webhooks}>
                            {(hook) => (
                                <li>
                                    <code class="workflow-code">
                                        {url(hook.path)}
                                    </code>
                                    <Button
                                        variant="icon"
                                        aria-label={t(
                                            'overview.copy',
                                            'Copy the address'
                                        )}
                                        title={t(
                                            'overview.copy',
                                            'Copy the address'
                                        )}
                                        onClick={() =>
                                            void copy(hook.blockId, hook.path)
                                        }
                                    >
                                        <AiOutlineCopy />
                                    </Button>
                                    <Show when={copied() === hook.blockId}>
                                        <span class="muted" role="status">
                                            {t('overview.copied', 'Copied')}
                                        </span>
                                    </Show>
                                </li>
                            )}
                        </For>
                    </ul>
                </section>
            </Show>

            <Show when={props.workflow.schedules.length > 0}>
                <section class="workflow-section">
                    <h2>{t('overview.schedules', 'Schedules')}</h2>
                    <ul class="workflow-list">
                        <For each={props.workflow.schedules}>
                            {(schedule) => (
                                <li>
                                    <code class="workflow-code">
                                        {schedule.cron}
                                    </code>
                                    <span class="muted">
                                        {schedule.timeZone}
                                    </span>
                                    <span>
                                        {t(
                                            'overview.next',
                                            'next {date}'
                                        ).replace(
                                            '{date}',
                                            DateHelper.format(
                                                schedule.nextRunAt,
                                                user()?.timeZone,
                                                i18n.currentLocale()
                                            )
                                        )}
                                    </span>
                                </li>
                            )}
                        </For>
                    </ul>
                </section>
            </Show>

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
