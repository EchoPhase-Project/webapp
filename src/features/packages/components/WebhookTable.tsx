import { createSignal, Show } from 'solid-js';
import { IconCopy, IconEye, IconEyeOff, IconPencil } from '@shared/ui/icons';
import type { Workflow } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { createClipboard } from '@shared/lib/clipboard';
import Button from '@shared/ui/Button';
import Checkbox from '@shared/ui/Checkbox';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Modal from '@shared/ui/Modal';
import RadioGroup from '@shared/ui/RadioGroup';
import { Cell, Row, Table } from '@shared/ui/Table';
import RemoveButton from '@shared/ui/RemoveButton';
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
export default function WebhookTable(props: {
    workflow: Workflow;
    onChange: (workflow: Workflow) => void;
}) {
    const t = useLocalizer('workflows');
    const [shown, setShown] = createSignal<number | null>(null);
    const { copied, copy } = createClipboard();
    const {
        busy,
        errors,
        save,
        remove,
        editing,
        setEditing,
        setDeleting,
        deleting,
    } = useProgramSave<Webhook>(
        () => props.workflow,
        (saved) => props.onChange(saved)
    );

    const url = (hook: Webhook) => `${location.origin}${hook.path}`;
    const secret = (hook: Webhook) => {
        const value = paramsOf(props.workflow.program, hook.blockId).secret;
        return typeof value === 'string' ? value : '';
    };
    const respondText = (respond: Respond) => respondLabel(t, respond);

    async function update(blockId: number, respond: Respond, replace: boolean) {
        let program = setParams(props.workflow.program, blockId, { respond });
        if (replace)
            program = setParams(program, blockId, { secret: newSecret() });
        if (await save(program)) {
            if (replace) setShown(blockId);
            setEditing(null);
        }
    }

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
            <ErrorSummary errors={errors()} />
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
            <Show when={copied()}>
                <span class="muted" role="status">
                    {t('ui.copied', 'Copied')}
                </span>
            </Show>

            <Modal
                open={!!editing()}
                title={t('webhook.edit', 'Edit the webhook')}
                onClose={() => setEditing(null)}
            >
                <Show when={editing()}>
                    {(hook) => (
                        <WebhookForm
                            hook={hook()}
                            busy={busy()}
                            onSave={(respond, replace) =>
                                void update(hook().blockId, respond, replace)
                            }
                        />
                    )}
                </Show>
            </Modal>
            <ConfirmDialog
                item={deleting()}
                title={t('webhook.delete_title', 'Delete this webhook?')}
                confirm={t('ui.delete', 'Delete')}
                busy={busy()}
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

function WebhookForm(form: {
    hook: Webhook;
    busy: boolean;
    onSave: (respond: Respond, replace: boolean) => void;
}) {
    const t = useLocalizer('workflows');
    // eslint-disable-next-line solid/reactivity
    const [respond, setRespond] = createSignal<Respond>(form.hook.respond);
    const [replace, setReplace] = createSignal(false);
    return (
        <form
            class="vert-form"
            noValidate
            onSubmit={(e) => {
                e.preventDefault();
                form.onSave(respond(), replace());
            }}
        >
            <RadioGroup
                legend={t('webhook.respond_title', 'Answer')}
                showLegend
                name="respond"
                value={respond()}
                onChange={setRespond}
                options={RESPONDS.map((option) => ({
                    value: option,
                    label: respondLabel(t, option),
                    description: t(`webhook.respond.${option}`, option),
                }))}
            />
            <Checkbox
                checked={replace()}
                onChange={setReplace}
                label={t('webhook.replace', 'New secret')}
                description={t(
                    'webhook.replace_short',
                    'The old one stops working at once.'
                )}
            />
            <Button type="submit" busy={form.busy}>
                {t('settings.save', 'Save')}
            </Button>
        </form>
    );
}
