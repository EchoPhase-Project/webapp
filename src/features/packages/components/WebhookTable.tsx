import { createSignal, For, Show } from 'solid-js';
import {
    AiOutlineCopy,
    AiOutlineDelete,
    AiOutlineEdit,
    AiOutlineEye,
    AiOutlineEyeInvisible,
} from 'solid-icons/ai';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import type { Workflow } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Modal from '@shared/ui/Modal';
import { Cell, Row, Table } from '@shared/ui/Table';
import { saveWorkflow } from '@features/packages/api';
import {
    newSecret,
    paramsOf,
    removeBlock,
    setParams,
} from '@features/packages/program-edit';

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
    const [copied, setCopied] = createSignal<string | null>(null);
    const [editing, setEditing] = createSignal<Webhook | null>(null);
    const [deleting, setDeleting] = createSignal<Webhook | null>(null);
    const [busy, setBusy] = createSignal(false);
    const [errors, setErrors] = createSignal<FormErrors>({});

    const url = (hook: Webhook) => `${location.origin}${hook.path}`;
    const secret = (hook: Webhook) => {
        const value = paramsOf(props.workflow.program, hook.blockId).secret;
        return typeof value === 'string' ? value : '';
    };
    const respondText = (respond: Respond) => respondLabel(t, respond);

    async function copy(text: string, what: string) {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(what);
        } catch {
            // No clipboard (insecure context): nothing to do.
        }
    }

    async function save(program: Workflow['program']) {
        setBusy(true);
        try {
            const result = await saveWorkflow(props.workflow, { program });
            if (!result.ok) {
                setErrors(groupErrors(result.errors, []));
                return false;
            }
            setErrors({});
            props.onChange(result.data);
            return true;
        } finally {
            setBusy(false);
        }
    }

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
        actions: t('table.actions', 'Actions'),
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
            <ErrorSummary errors={errors()} inputId={() => ''} />
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
                                    <AiOutlineCopy />
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
                                        fallback={<AiOutlineEye />}
                                    >
                                        <AiOutlineEyeInvisible />
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
                                    <AiOutlineCopy />
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
                                    <AiOutlineEdit />
                                </Button>
                                <Button
                                    variant="icon-danger"
                                    aria-label={t(
                                        'webhook.delete',
                                        'Delete the webhook'
                                    )}
                                    title={t(
                                        'webhook.delete',
                                        'Delete the webhook'
                                    )}
                                    disabled={busy()}
                                    onClick={() => setDeleting(hook)}
                                >
                                    <AiOutlineDelete />
                                </Button>
                            </span>
                        </Cell>
                    </Row>
                )}
            />
            <Show when={copied()}>
                <span class="muted" role="status">
                    {t('overview.copied', 'Copied')}
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
                open={!!deleting()}
                title={t('webhook.delete_title', 'Delete this webhook?')}
                confirm={t('delete.confirm', 'Delete')}
                busy={busy()}
                onConfirm={() => {
                    const hook = deleting();
                    if (hook)
                        void save(
                            removeBlock(props.workflow.program, hook.blockId)
                        ).then(() => setDeleting(null));
                }}
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
            <fieldset class="choices">
                <legend class="field-label">
                    {t('webhook.respond_title', 'Answer')}
                </legend>
                <For each={RESPONDS}>
                    {(option) => (
                        <label class="choice">
                            <input
                                type="radio"
                                name="respond"
                                checked={respond() === option}
                                onChange={() => setRespond(option)}
                            />
                            <span class="choice-text">
                                <strong>{respondLabel(t, option)}</strong>
                                <span class="muted">
                                    {t(`webhook.respond.${option}`, option)}
                                </span>
                            </span>
                        </label>
                    )}
                </For>
            </fieldset>
            <label class="choice">
                <input
                    type="checkbox"
                    checked={replace()}
                    onChange={(e) => setReplace(e.currentTarget.checked)}
                />
                <span class="choice-text">
                    <strong>{t('webhook.replace', 'New secret')}</strong>
                    <span class="muted">
                        {t(
                            'webhook.replace_short',
                            'The old one stops working at once.'
                        )}
                    </span>
                </span>
            </label>
            <Button type="submit" busy={form.busy}>
                {t('settings.save', 'Save')}
            </Button>
        </form>
    );
}
