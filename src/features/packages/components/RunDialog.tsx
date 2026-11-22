import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import Modal from '@shared/ui/Modal';
import TextArea from '@shared/ui/forms/TextArea';
import { createForm } from '@shared/ui/forms/form';
import { runWorkflowMutation } from '@features/packages/api/runs';

/** The input as sent: the JSON value, or undefined for no text. */
const parse = (text: string): unknown =>
    text.trim() ? JSON.parse(text) : undefined;

/**
 * Runs it now, active or not, with an input: a JSON value, or nothing. Input
 * that is not JSON is the field's error; what the server refuses (too many
 * runs, a program with issues) is the dialog's, at its top.
 */
export default function RunDialog(props: {
    workflowId: string;
    /** Its package: the new run shows in the package's runs too. */
    packageId: string;
    open: boolean;
    onClose: () => void;
    onStarted: () => void;
}) {
    const t = useLocalizer('workflows');
    const form = createForm({
        id: 'workflow-run',
        initial: () => ({ input: '' }),
        // The message shows under the input; ErrorSummary moves the focus
        // to it, so it is read out.
        check: ({ input }) => {
            try {
                parse(input);
                return null;
            } catch {
                return {
                    input: t(
                        'run.bad_json',
                        'The input is not JSON: a value such as {"user": "ann"}, a number or "text".'
                    ),
                };
            }
        },
    });
    const starting = form.mutation(runWorkflowMutation);
    const start = form.onSubmit(({ input }) =>
        starting.run(
            {
                id: props.workflowId,
                packageId: props.packageId,
                input: parse(input),
            },
            () => {
                form.reset();
                props.onStarted();
            }
        )
    );

    return (
        <Modal
            open={props.open}
            title={t('run.title', 'Run now')}
            onClose={() => props.onClose()}
        >
            <form class="vert-form" onSubmit={start} noValidate>
                <ErrorSummary {...form.summary} />
                <TextArea
                    {...form.input('input')}
                    label={t(
                        'run.input',
                        'Input (JSON, optional): what its first blocks get as input'
                    )}
                    showLabel
                    rows={6}
                    spellcheck={false}
                />
                <div class="actions-row actions-row--end">
                    <Button type="submit" busy={form.busy()}>
                        {t('run.start', 'Run')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
