import { createSignal } from 'solid-js';
import { createSubmit } from '@shared/api/submit';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Modal from '@shared/ui/Modal';
import TextArea from '@shared/ui/TextArea';
import { runWorkflow } from '@features/packages/api';

const inputId = 'workflow-run-input';

/**
 * Runs it now, active or not, with an input: a JSON value, or nothing. Input
 * that is not JSON is the field's error; what the server refuses (too many
 * runs, a program with issues) is the dialog's, at its top.
 */
export default function RunDialog(props: {
    workflowId: string;
    open: boolean;
    onClose: () => void;
    onStarted: () => void;
}) {
    const t = useLocalizer('workflows');
    const [input, setInput] = createSignal('');
    const { busy, errors, setErrors, run } = createSubmit();

    async function start(e: Event) {
        e.preventDefault();
        let value: unknown = undefined;
        if (input().trim()) {
            try {
                value = JSON.parse(input());
            } catch {
                // No code: the message is shown as it is. ErrorSummary moves
                // the focus to the input, so it is read out.
                setErrors({
                    input: [
                        {
                            code: '',
                            message: t(
                                'run.bad_json',
                                'The input is not JSON: a value such as {"user": "ann"}, a number or "text".'
                            ),
                        },
                    ],
                });
                return;
            }
        }
        await run(
            () => runWorkflow(props.workflowId, value),
            () => {
                setInput('');
                props.onStarted();
            }
        );
    }

    return (
        <Modal
            open={props.open}
            title={t('run.title', 'Run now')}
            onClose={() => props.onClose()}
        >
            <form class="vert-form" onSubmit={(e) => void start(e)} noValidate>
                <ErrorSummary errors={errors()} inputId={() => inputId} />
                <TextArea
                    id={inputId}
                    label={t(
                        'run.input',
                        'Input (JSON, optional): what its first blocks get as input'
                    )}
                    showLabel
                    errors={errors().input}
                    rows={6}
                    spellcheck={false}
                    value={input()}
                    onInput={(e) => setInput(e.currentTarget.value)}
                />
                <div class="actions-row actions-row--end">
                    <Button type="submit" busy={busy()}>
                        {t('run.start', 'Run')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
