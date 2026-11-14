import { createSignal } from 'solid-js';
import type { ErrorItem } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import Modal from '@shared/ui/Modal';
import TextArea from '@shared/ui/TextArea';
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
    // The message as the field's error (no code: shown as it is).
    const errors = (): ErrorItem[] | undefined => {
        const message = error();
        return message ? [{ code: '', message }] : undefined;
    };
    const [busy, setBusy] = createSignal(false);

    /** Shows the message under the input and focuses it, so it is read out. */
    function fail(message: string) {
        setError(message);
        document.getElementById(inputId)?.focus();
    }

    async function run(e: Event) {
        e.preventDefault();
        let value: unknown = undefined;
        if (input().trim()) {
            try {
                value = JSON.parse(input());
            } catch {
                fail(
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
                fail(result.errors.map((x) => x.message).join(' '));
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
                <TextArea
                    id={inputId}
                    label={t(
                        'run.input',
                        'Input (JSON, optional): what its first blocks get as input'
                    )}
                    showLabel
                    errors={errors()}
                    rows={6}
                    spellcheck={false}
                    value={input()}
                    onInput={(e) => setInput(e.currentTarget.value)}
                />
                <div class="workflow-actions">
                    <Button type="submit" busy={busy()}>
                        {t('run.start', 'Run')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
