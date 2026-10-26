import { For, Show } from 'solid-js';
import { useAuth } from '@shared/api/auth-provider';
import type { Workflow } from '@shared/api/types';
import { DateHelper } from '@shared/lib/date-helper';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import WebhookCard from './WebhookCard';

/**
 * What a workflow is: its blocks in order, how to call its webhooks
 * (address, secret, answer) and when its schedules fire next.
 */
export default function ProgramOverview(props: {
    workflow: Workflow;
    onChange: (workflow: Workflow) => void;
}) {
    const t = useLocalizer('workflows');
    const i18n = useI18n();
    const { user } = useAuth();

    return (
        <div class="workflow-overview">
            <Show when={props.workflow.webhooks.length > 0}>
                <section class="workflow-section">
                    <h2>{t('overview.webhooks', 'Webhooks')}</h2>
                    <p class="muted">
                        {t(
                            'overview.webhooks_hint',
                            'Send a POST to the address with the header X-Webhook-Secret set to its secret; the body (JSON) is the run’s input.'
                        )}
                    </p>
                    <ul class="workflow-webhooks">
                        <For each={props.workflow.webhooks}>
                            {(hook) => (
                                <WebhookCard
                                    workflow={props.workflow}
                                    hook={hook}
                                    onChange={(w) => props.onChange(w)}
                                />
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
