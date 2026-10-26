import { createSignal, Show } from 'solid-js';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import Modal from '@shared/ui/Modal';
import { runWorkflow } from '@features/packages/api';

const inputId = 'workflow-run-input';

/** Runs it now, active or not, with an input: a JSON value, or nothing. */
export default function RunDialog(props: {
    workflowId: string;
    open: boolean;
    onClose: () => void;
    onStarted: () => void;
}) {
    const t = useLocalizer('workflows');
    const [input, setInput] = createSignal('');
    const [error, setError] = createSignal<string | null>(null);
    const [busy, setBusy] = createSignal(false);

    async function run(e: Event) {
        e.preventDefault();
        let value: unknown = undefined;
        if (input().trim()) {
            try {
                value = JSON.parse(input());
            } catch {
                setError(
                    t(
                        'run.bad_json',
                        'The input is not JSON: a value such as {"user": "ann"}, a number or "text".'
                    )
                );
                return;
            }
        }
        setBusy(true);
        try {
            const result = await runWorkflow(props.workflowId, value);
            if (!result.ok) {
                setError(result.errors.map((x) => x.message).join(' '));
                return;
            }
            setError(null);
            setInput('');
            props.onStarted();
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal
            open={props.open}
            title={t('run.title', 'Run now')}
            onClose={() => props.onClose()}
        >
            <form class="vert-form" onSubmit={(e) => void run(e)} noValidate>
                <label class="field-label" for={inputId}>
                    {t(
                        'run.input',
                        'Input (JSON, optional): what its first blocks get as input'
                    )}
                </label>
                <textarea
                    id={inputId}
                    class="workflow-textarea"
                    classList={{ invalid: !!error() }}
                    rows={6}
                    spellcheck={false}
                    aria-invalid={!!error()}
                    aria-describedby={error() ? `${inputId}-error` : undefined}
                    value={input()}
                    onInput={(e) => setInput(e.currentTarget.value)}
                />
                <Show when={error()}>
                    <p
                        id={`${inputId}-error`}
                        class="workflow-error"
                        role="alert"
                    >
                        {error()}
                    </p>
                </Show>
                <div class="workflow-actions">
                    <Button type="submit" busy={busy()}>
                        {t('run.start', 'Run')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
