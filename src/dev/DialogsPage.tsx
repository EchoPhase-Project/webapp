import { createSignal, For } from 'solid-js';
import { FORM, type FormErrors } from '@shared/api/errors';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import Field from '@shared/ui/forms/Field';
import Modal from '@shared/ui/Modal';
import RemoveButton from '@shared/ui/RemoveButton';
import Switch from '@shared/ui/Switch';
import { DevGrid, DevLog, DevSample, DevSection } from './DevKit';

type Which = 'usual' | 'wide' | 'patterned' | 'fixed';

const failure: FormErrors = {
    [FORM]: [
        {
            code: 'dev_example',
            message: 'The server could not delete it. Try again.',
        },
    ],
};

/** Modal in each form, and ConfirmDialog with busy and errors. */
export default function DialogsPage() {
    const [open, setOpen] = createSignal<Which | null>(null);
    const [log, setLog] = createSignal('');
    const close = () => setOpen(null);

    // ConfirmDialog with `open`: a fake action that takes a second.
    const [confirming, setConfirming] = createSignal(false);
    const [busy, setBusy] = createSignal(false);
    const [fail, setFail] = createSignal(true);
    const [errors, setErrors] = createSignal<FormErrors | undefined>();

    function cancel() {
        setConfirming(false);
        setErrors(undefined);
    }

    function revokeAll() {
        setBusy(true);
        setErrors(undefined);
        setTimeout(() => {
            setBusy(false);
            if (fail()) {
                setErrors(failure);
                return;
            }
            setConfirming(false);
            setLog('Revoked all sessions');
        }, 1000);
    }

    // ConfirmDialog with `item`: open while there is one.
    const [files, setFiles] = createSignal(['report.pdf', 'logo.png']);
    const [doomed, setDoomed] = createSignal<string | null>(null);

    return (
        <>
            <DevLog>{log()}</DevLog>

            <DevSection
                title="Modal"
                note="Escape, the close button and a click beside the card close it, unless it is not dismissible. The focus goes to the first field, then back to the trigger."
            >
                <DevGrid>
                    <DevSample title="A form">
                        <div class="actions-row">
                            <Button onClick={() => setOpen('usual')}>
                                Open
                            </Button>
                        </div>
                    </DevSample>
                    <DevSample title="Wide">
                        <div class="actions-row">
                            <Button onClick={() => setOpen('wide')}>
                                Open wide
                            </Button>
                        </div>
                    </DevSample>
                    <DevSample title="Patterned">
                        <div class="actions-row">
                            <Button onClick={() => setOpen('patterned')}>
                                Open patterned
                            </Button>
                        </div>
                    </DevSample>
                    <DevSample title="Not dismissible">
                        <div class="actions-row">
                            <Button onClick={() => setOpen('fixed')}>
                                Open
                            </Button>
                        </div>
                    </DevSample>
                </DevGrid>
            </DevSection>

            <DevSection
                title="ConfirmDialog"
                note="Cancel has the focus. The action is the red button."
            >
                <DevGrid>
                    <DevSample title="With open, busy and errors">
                        <Switch
                            label="The action fails"
                            checked={fail()}
                            onChange={setFail}
                        />
                        <div class="actions-row">
                            <Button
                                variant="danger-outline"
                                onClick={() => setConfirming(true)}
                            >
                                Revoke all sessions
                            </Button>
                        </div>
                    </DevSample>
                    <DevSample title="With item">
                        <ul class="dev-plain">
                            <For
                                each={files()}
                                fallback={<li class="muted">No files.</li>}
                            >
                                {(file) => (
                                    <li class="dev-row">
                                        <span>{file}</span>
                                        <RemoveButton
                                            label={`Delete ${file}`}
                                            onClick={() => setDoomed(file)}
                                        />
                                    </li>
                                )}
                            </For>
                        </ul>
                        <div class="actions-row">
                            <Button
                                variant="ghost"
                                onClick={() =>
                                    setFiles(['report.pdf', 'logo.png'])
                                }
                            >
                                Reset
                            </Button>
                        </div>
                    </DevSample>
                </DevGrid>
            </DevSection>

            <Modal
                open={open() === 'usual'}
                title="New API client"
                onClose={close}
            >
                <form
                    class="page-stack"
                    onSubmit={(e) => {
                        e.preventDefault();
                        setLog('Saved the client');
                        close();
                    }}
                >
                    <Field
                        id="dev-dialogs-name"
                        name="name"
                        label="Name"
                        showLabel
                    />
                    <div class="actions-row actions-row--end">
                        <Button variant="ghost" onClick={close}>
                            Cancel
                        </Button>
                        <Button type="submit">Save</Button>
                    </div>
                </form>
            </Modal>
            <Modal
                open={open() === 'wide'}
                title="A wide dialog"
                wide
                onClose={close}
            >
                <p>
                    A wide dialog is for writing, such as a note. It is wider
                    than the dialog of a form, and it fills a phone.
                </p>
            </Modal>
            <Modal
                open={open() === 'patterned'}
                title="A patterned dialog"
                class="patterned"
                onClose={close}
            >
                <p>The pattern is for brand moments, such as the outage.</p>
            </Modal>
            <Modal
                open={open() === 'fixed'}
                title="Not dismissible"
                dismissible={false}
            >
                <p>
                    No close button, and Escape does nothing. Only the owner
                    closes it.
                </p>
                <div class="actions-row actions-row--end">
                    <Button onClick={close}>Close it</Button>
                </div>
            </Modal>

            <ConfirmDialog
                open={confirming()}
                title="Revoke all sessions?"
                confirm="Revoke all"
                busy={busy()}
                errors={errors()}
                onCancel={cancel}
                onConfirm={revokeAll}
            >
                <p>Every device signs out, this one too.</p>
            </ConfirmDialog>
            <ConfirmDialog
                item={doomed()}
                title="Delete the file?"
                confirm="Delete"
                onCancel={() => setDoomed(null)}
                onConfirm={(file) => {
                    setFiles((all) => all.filter((f) => f !== file));
                    setDoomed(null);
                    setLog(`Deleted ${file}`);
                }}
            >
                {(file) => (
                    <p>
                        <strong>{file}</strong> goes for good. Links to it stop
                        working.
                    </p>
                )}
            </ConfirmDialog>
        </>
    );
}
