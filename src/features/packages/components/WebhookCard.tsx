import { createSignal, Show } from 'solid-js';
import {
    AiOutlineCopy,
    AiOutlineEye,
    AiOutlineEyeInvisible,
} from 'solid-icons/ai';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import type { Workflow } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import ErrorSummary from '@shared/ui/ErrorSummary';
import { saveWorkflow } from '@features/packages/api';

type Webhook = Workflow['webhooks'][number];

/** A new secret: 32 random bytes, base64url (the server wants at least 16 characters). */
export function newSecret(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

const paramsOf = (workflow: Workflow, blockId: number) => {
    const block = workflow.program.blocks.find((b) => b.id === blockId);
    return (block?.params ?? {}) as Record<string, unknown>;
};

/**
 * Where a WebhookTrigger listens and how to call it: the address, the
 * secret the caller sends (hidden until asked, copyable, replaceable) and
 * what the caller gets back.
 */
export default function WebhookCard(props: {
    workflow: Workflow;
    hook: Webhook;
    onChange: (workflow: Workflow) => void;
}) {
    const t = useLocalizer('workflows');
    const [shown, setShown] = createSignal(false);
    const [copied, setCopied] = createSignal<'url' | 'secret' | null>(null);
    const [replacing, setReplacing] = createSignal(false);
    const [busy, setBusy] = createSignal(false);
    const [errors, setErrors] = createSignal<FormErrors>({});

    const url = () => `${location.origin}${props.hook.path}`;
    const secret = () => {
        const value = paramsOf(props.workflow, props.hook.blockId).secret;
        return typeof value === 'string' ? value : '';
    };

    async function copy(what: 'url' | 'secret') {
        try {
            await navigator.clipboard.writeText(
                what === 'url' ? url() : secret()
            );
            setCopied(what);
        } catch {
            // No clipboard (insecure context): show it to select.
            if (what === 'secret') setShown(true);
        }
    }

    async function replace() {
        setBusy(true);
        try {
            const program = {
                ...props.workflow.program,
                blocks: props.workflow.program.blocks.map((b) =>
                    b.id === props.hook.blockId
                        ? {
                              ...b,
                              params: {
                                  ...paramsOf(props.workflow, b.id),
                                  secret: newSecret(),
                              },
                          }
                        : b
                ),
            };
            const result = await saveWorkflow(props.workflow, { program });
            if (!result.ok) {
                setErrors(groupErrors(result.errors, []));
                return;
            }
            setErrors({});
            setShown(true);
            setCopied(null);
            props.onChange(result.data);
        } finally {
            setBusy(false);
            setReplacing(false);
        }
    }

    return (
        <li class="workflow-webhook">
            <ErrorSummary errors={errors()} inputId={() => ''} />
            <div class="workflow-webhook-row">
                <span class="workflow-webhook-label">
                    {t('webhook.address', 'Address')}
                </span>
                <code class="workflow-code">{url()}</code>
                <Button
                    variant="icon"
                    aria-label={t('overview.copy', 'Copy the address')}
                    title={t('overview.copy', 'Copy the address')}
                    onClick={() => void copy('url')}
                >
                    <AiOutlineCopy />
                </Button>
            </div>
            <div class="workflow-webhook-row">
                <span class="workflow-webhook-label">
                    {t('webhook.secret', 'Secret')}
                </span>
                <code
                    class="workflow-code"
                    classList={{ 'workflow-code--hidden': !shown() }}
                >
                    {shown() ? secret() : '•'.repeat(16)}
                </code>
                <Button
                    variant="icon"
                    aria-label={
                        shown()
                            ? t('webhook.hide', 'Hide the secret')
                            : t('webhook.show', 'Show the secret')
                    }
                    title={
                        shown()
                            ? t('webhook.hide', 'Hide the secret')
                            : t('webhook.show', 'Show the secret')
                    }
                    aria-pressed={shown()}
                    onClick={() => setShown((s) => !s)}
                >
                    <Show when={shown()} fallback={<AiOutlineEye />}>
                        <AiOutlineEyeInvisible />
                    </Show>
                </Button>
                <Button
                    variant="icon"
                    aria-label={t('webhook.copy', 'Copy the secret')}
                    title={t('webhook.copy', 'Copy the secret')}
                    onClick={() => void copy('secret')}
                >
                    <AiOutlineCopy />
                </Button>
                <Button
                    variant="ghost"
                    disabled={busy()}
                    onClick={() => setReplacing(true)}
                >
                    {t('webhook.replace', 'New secret')}
                </Button>
            </div>
            <Show when={copied()}>
                <span class="muted" role="status">
                    {copied() === 'url'
                        ? t('overview.copied', 'Copied')
                        : t('webhook.copied', 'Secret copied')}
                </span>
            </Show>
            <p class="muted workflow-webhook-respond">
                {
                    {
                        Immediately: t(
                            'webhook.respond.Immediately',
                            'The caller gets 202 at once, with the run’s id; the run goes on.'
                        ),
                        OnFinish: t(
                            'webhook.respond.OnFinish',
                            'The caller waits for the run and gets its last block’s output (500 if it fails).'
                        ),
                        ByBlock: t(
                            'webhook.respond.ByBlock',
                            'The caller waits for a RespondToWebhook block and gets what it sends.'
                        ),
                    }[props.hook.respond]
                }
            </p>
            <ConfirmDialog
                open={replacing()}
                title={t('webhook.replace_title', 'Give it a new secret?')}
                confirm={t('webhook.replace', 'New secret')}
                busy={busy()}
                onConfirm={() => void replace()}
                onCancel={() => setReplacing(false)}
            >
                {t(
                    'webhook.replace_body',
                    'The old secret stops working at once: whoever calls this webhook needs the new one. It is a change of the workflow, saved as a new version.'
                )}
            </ConfirmDialog>
        </li>
    );
}
