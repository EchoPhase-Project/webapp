import { createSignal, For } from 'solid-js';
import { mutationOptions } from '@tanstack/solid-query';
import { ApiError } from '@shared/api/client';
import Button from '@shared/ui/Button';
import ConfirmDialog, { createConfirm } from '@shared/ui/ConfirmDialog';
import Field from '@shared/ui/forms/Field';
import Modal from '@shared/ui/Modal';
import RemoveButton from '@shared/ui/RemoveButton';
import Switch from '@shared/ui/Switch';
import { DevGrid, DevLog, DevSample, DevSection } from './DevKit';

type Which = 'usual' | 'wide' | 'patterned' | 'fixed';

/**
 * A fake action, as a feature's description gives it; no request goes out.
 * It takes a second, and fails while `fail` says so.
 */
const revokeAllMutation = (fail: () => boolean) => () =>
    mutationOptions({
        mutationFn: () =>
            new Promise<void>((resolve, reject) =>
                setTimeout(() => {
                    if (!fail()) return resolve();
                    reject(
                        new ApiError(
                            [
                                {
                                    code: 'dev_example',
                                    message:
                                        'The server could not revoke them. Try again.',
                                },
                            ],
                            503
                        )
                    );
                }, 1000)
            ),
    });

/** Modal in each form, and ConfirmDialog on createConfirm and on its own. */
export default function DialogsPage() {
    const [open, setOpen] = createSignal<Which | null>(null);
    const [log, setLog] = createSignal('');
    const close = () => setOpen(null);

    // createConfirm: a fake action that takes a second. The dialog closes
    // only when it succeeds; a failure stays in it.
    const [fail, setFail] = createSignal(true);
    const revokeAll = createConfirm(
        revokeAllMutation(fail),
        (_: 'all') => {},
        () => setLog('Revoked all sessions')
    );

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
                note="Cancel has the focus. The action is the red button. With createConfirm, a failure stays in the dialog; cancel clears it."
            >
                <DevGrid>
                    <DevSample title="createConfirm: busy and errors">
                        <Switch
                            label="The action fails"
                            checked={fail()}
                            onChange={setFail}
                        />
                        <div class="actions-row">
                            <Button
                                variant="danger-outline"
                                onClick={() => revokeAll.ask('all')}
                            >
                                Revoke all sessions
                            </Button>
                        </div>
                    </DevSample>
                    <DevSample title="With item, no action">
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
                {...revokeAll.dialog}
                title="Revoke all sessions?"
                confirm="Revoke all"
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
