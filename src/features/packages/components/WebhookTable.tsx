import { createSignal, Show } from 'solid-js';
import { IconCopy, IconEye, IconEyeOff, IconPencil } from '@shared/ui/icons';
import type { Workflow } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { createClipboard } from '@shared/lib/clipboard';
import Button from '@shared/ui/Button';
import Checkbox from '@shared/ui/forms/Checkbox';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import Modal from '@shared/ui/Modal';
import RadioGroup from '@shared/ui/forms/RadioGroup';
import { createForm } from '@shared/ui/forms/form';
import { Cell, Row, Table } from '@shared/ui/Table';
import RemoveButton from '@shared/ui/RemoveButton';
import { updateWorkflowMutation } from '@features/packages/api/workflows';
import {
    newSecret,
    paramsOf,
    setParams,
} from '@features/packages/program-edit';
import { useProgramSave } from '@features/packages/program-save';

type Webhook = Workflow['webhooks'][number];
type Respond = Webhook['respond'];
const RESPONDS: Respond[] = ['Immediately', 'OnFinish', 'ByBlock'];

/** What the caller gets back, in a few words. */
function respondLabel(
    t: (key: string, text: string) => string,
    respond: Respond
) {
    return {
        Immediately: t('webhook.respond_short.Immediately', '202 at once'),
        OnFinish: t('webhook.respond_short.OnFinish', 'The run’s output'),
        ByBlock: t('webhook.respond_short.ByBlock', 'RespondToWebhook'),
    }[respond];
}

/**
 * A workflow's webhooks (its WebhookTriggers) as a table: the address and
 * the secret (shown on request, copyable), what the caller gets back, and
 * editing (the answer, a new secret) or deleting one.
 */
export default function WebhookTable(props: { workflow: Workflow }) {
    const t = useLocalizer('workflows');
    const [shown, setShown] = createSignal<number | null>(null);
    const { copied, copy } = createClipboard();
    const { busy, errors, remove, editing, setEditing, setDeleting, deleting } =
        useProgramSave<Webhook>(() => props.workflow);

    const url = (hook: Webhook) => `${location.origin}${hook.path}`;
    const secret = (hook: Webhook) => {
        const value = paramsOf(props.workflow.program, hook.blockId).secret;
        return typeof value === 'string' ? value : '';
    };
    const respondText = (respond: Respond) => respondLabel(t, respond);

    // Read in render: the namespace may arrive after the first one.
    const column = () => ({
        address: t('webhook.address', 'Address'),
        secret: t('webhook.secret', 'Secret'),
        respond: t('webhook.respond_title', 'Answer'),
        actions: t('ui.actions', 'Actions'),
    });

    return (
        <section class="workflow-panel">
            <div class="workflow-panel-head">
                <p class="muted">
                    {t(
                        'webhook.lead',
                        'POST to the address with the header X-Webhook-Secret; the JSON body is the run’s input.'
                    )}
                </p>
            </div>
            <Show when={!editing() && !deleting()}>
                <ErrorSummary errors={errors()} />
            </Show>
            <Table
                data={props.workflow.webhooks}
                headers={Object.values(column())}
                placeholder={() => <>{t('webhook.none', 'No webhooks.')}</>}
                tableProps={{ class: 'workflow-table' }}
                render={({ item: hook }) => (
                    <Row>
                        <Cell label={column().address}>
                            <span class="workflow-cell-line">
                                <code class="workflow-code">{url(hook)}</code>
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
                                        void copy(
                                            url(hook),
                                            `url${hook.blockId}`
                                        )
                                    }
                                >
                                    <IconCopy />
                                </Button>
                            </span>
                        </Cell>
                        <Cell label={column().secret}>
                            <span class="workflow-cell-line">
                                <code
                                    class="workflow-code"
                                    classList={{
                                        'workflow-code--hidden':
                                            shown() !== hook.blockId,
                                    }}
                                >
                                    {shown() === hook.blockId
                                        ? secret(hook)
                                        : '•'.repeat(12)}
                                </code>
                                <Button
                                    variant="icon"
                                    aria-pressed={shown() === hook.blockId}
                                    aria-label={
                                        shown() === hook.blockId
                                            ? t(
                                                  'webhook.hide',
                                                  'Hide the secret'
                                              )
                                            : t(
                                                  'webhook.show',
                                                  'Show the secret'
                                              )
                                    }
                                    title={
                                        shown() === hook.blockId
                                            ? t(
                                                  'webhook.hide',
                                                  'Hide the secret'
                                              )
                                            : t(
                                                  'webhook.show',
                                                  'Show the secret'
                                              )
                                    }
                                    onClick={() =>
                                        setShown((s) =>
                                            s === hook.blockId
                                                ? null
                                                : hook.blockId
                                        )
                                    }
                                >
                                    <Show
                                        when={shown() === hook.blockId}
                                        fallback={<IconEye />}
                                    >
                                        <IconEyeOff />
                                    </Show>
                                </Button>
                                <Button
                                    variant="icon"
                                    aria-label={t(
                                        'webhook.copy',
                                        'Copy the secret'
                                    )}
                                    title={t('webhook.copy', 'Copy the secret')}
                                    onClick={() =>
                                        void copy(
                                            secret(hook),
                                            `secret${hook.blockId}`
                                        )
                                    }
                                >
                                    <IconCopy />
                                </Button>
                            </span>
                        </Cell>
                        <Cell label={column().respond}>
                            {respondText(hook.respond)}
                        </Cell>
                        <Cell
                            label={column().actions}
                            props={{ class: 'actions' }}
                        >
                            <span class="workflow-actions-cell">
                                <Button
                                    variant="icon"
                                    aria-label={t(
                                        'webhook.edit',
                                        'Edit the webhook'
                                    )}
                                    title={t(
                                        'webhook.edit',
                                        'Edit the webhook'
                                    )}
                                    disabled={busy()}
                                    onClick={() => setEditing(hook)}
                                >
                                    <IconPencil />
                                </Button>
                                <RemoveButton
                                    label={t(
                                        'webhook.delete',
                                        'Delete the webhook'
                                    )}
                                    disabled={busy()}
                                    onClick={() => setDeleting(hook)}
                                />
                            </span>
                        </Cell>
                    </Row>
                )}
            />
            {/* Always there: a live region that comes with its message is not announced. */}
            <span class="muted" role="status">
                {copied() ? t('ui.copied', 'Copied') : ''}
            </span>

            <Modal
                open={!!editing()}
                title={t('webhook.edit', 'Edit the webhook')}
                onClose={() => setEditing(null)}
            >
                <Show when={editing()}>
                    {(hook) => (
                        <WebhookForm
                            workflow={props.workflow}
                            hook={hook()}
                            onSaved={(replaced) => {
                                if (replaced) setShown(hook().blockId);
                                setEditing(null);
                            }}
                        />
                    )}
                </Show>
            </Modal>
            <ConfirmDialog
                item={deleting()}
                title={t('webhook.delete_title', 'Delete this webhook?')}
                confirm={t('ui.delete', 'Delete')}
                busy={busy()}
                errors={errors()}
                onConfirm={(hook) => void remove(hook)}
                onCancel={() => setDeleting(null)}
            >
                {t(
                    'webhook.delete_body',
                    'Its address stops answering at once. It is a change of the workflow, saved as a new version.'
                )}
            </ConfirmDialog>
        </section>
    );
}

/** One webhook's answer and secret; it saves the program and shows its errors. */
function WebhookForm(props: {
    workflow: Workflow;
    hook: Webhook;
    onSaved: (replaced: boolean) => void;
}) {
    const t = useLocalizer('workflows');
    const form = createForm({
        id: 'webhook',
        initial: () => ({ respond: props.hook.respond, replace: false }),
    });
    const updating = form.mutation(updateWorkflowMutation);
    const save = form.onSubmit(({ respond, replace }) => {
        const blockId = props.hook.blockId;
        let program = setParams(props.workflow.program, blockId, { respond });
        if (replace)
            program = setParams(program, blockId, { secret: newSecret() });
        return updating.run(
            { workflow: props.workflow, changes: { program } },
            () => props.onSaved(replace)
        );
    });

    return (
        <form class="vert-form" noValidate onSubmit={save}>
            <ErrorSummary {...form.summary} />
            <RadioGroup
                {...form.control('respond')}
                legend={t('webhook.respond_title', 'Answer')}
                showLegend
                options={RESPONDS.map((option) => ({
                    value: option,
                    label: respondLabel(t, option),
                    description: t(`webhook.respond.${option}`, option),
                }))}
            />
            <Checkbox
                {...form.toggle('replace')}
                label={t('webhook.replace', 'New secret')}
                description={t(
                    'webhook.replace_short',
                    'The old one stops working at once.'
                )}
            />
            <Button type="submit" busy={form.busy()}>
                {t('settings.save', 'Save')}
            </Button>
        </form>
    );
}
