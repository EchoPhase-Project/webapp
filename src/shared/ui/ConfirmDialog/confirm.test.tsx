// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { mutationOptions } from '@tanstack/solid-query';
import { ApiError } from '@shared/api/client';
import { FORM } from '@shared/api/errors';
import { expectNoA11yViolations } from '@shared/testing/axe';
import { renderPage } from '@shared/testing/render-page';
import Button from '@shared/ui/Button';
import ConfirmDialog from './ConfirmDialog';
import { createConfirm } from './confirm';

type File = { id: string; name: string };
const report: File = { id: 'f1', name: 'report.pdf' };

/** A promise that the test settles. */
function later<T>() {
    let settle: { ok: (value: T) => void; fail: (e: unknown) => void } = {
        ok: () => {},
        fail: () => {},
    };
    const promise = new Promise<T>((ok, fail) => (settle = { ok, fail }));
    return { promise, ...settle };
}

const refusal = () =>
    new ApiError([{ code: 'Busy', message: 'The file is in use.' }], 409);

/** A page with one file and its delete, asked about first. */
function renderSample(remove: (id: string) => Promise<void>) {
    const made: { deletion?: ReturnType<typeof sample> } = {};
    const onOk = vi.fn();
    function sample() {
        return createConfirm(
            () => mutationOptions({ mutationFn: remove }),
            (file: File) => file.id,
            onOk
        );
    }
    renderPage(() => {
        const deletion = sample();
        made.deletion = deletion;
        return (
            <>
                <Button onClick={() => deletion.ask(report)}>Delete</Button>
                <ConfirmDialog
                    {...deletion.dialog}
                    title="Delete this file?"
                    confirm="Delete for good"
                >
                    {(file) => <p>{file.name} is deleted for good.</p>}
                </ConfirmDialog>
            </>
        );
    });
    const deletion = made.deletion;
    if (!deletion) throw new Error('the sample did not render');
    return { deletion, onOk };
}

const dialog = () => document.querySelector('dialog');

describe('createConfirm', () => {
    it('opens on ask, is busy while the action runs, closes on success, then runs onOk', async () => {
        const call = later<void>();
        const remove = vi.fn(() => call.promise);
        const { deletion, onOk } = renderSample(remove);
        expect(dialog()?.hasAttribute('open')).toBe(false);

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(dialog()?.hasAttribute('open')).toBe(true);
        expect(
            screen.getByText('report.pdf is deleted for good.')
        ).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', { name: 'Delete for good' })
        );
        await waitFor(() => expect(remove).toHaveBeenCalledOnce());
        expect(remove.mock.calls[0]).toEqual(['f1', expect.anything()]);
        expect(deletion.busy()).toBe(true);
        expect(deletion.dialog.busy).toBe(true);

        call.ok();
        await waitFor(() => expect(dialog()?.hasAttribute('open')).toBe(false));
        expect(onOk).toHaveBeenCalledWith(undefined, report);
        expect(deletion.item()).toBeNull();
        await waitFor(() => expect(deletion.busy()).toBe(false));
    });

    it('stays open with the errors when the action fails; another yes is ignored while busy', async () => {
        const call = later<void>();
        const remove = vi.fn(() => call.promise);
        const { deletion, onOk } = renderSample(remove);
        deletion.ask(report);

        deletion.dialog.onConfirm(report);
        expect(await deletion.confirm(report)).toBe(false);
        expect(remove).toHaveBeenCalledOnce();

        call.fail(refusal());
        await waitFor(() =>
            expect(screen.getByText('The file is in use.')).toBeTruthy()
        );
        expect(dialog()?.hasAttribute('open')).toBe(true);
        expect(deletion.errors()[FORM]).toHaveLength(1);
        expect(onOk).not.toHaveBeenCalled();
        await expectNoA11yViolations();
    });

    it('clears the errors on cancel and on the next ask', async () => {
        const remove = vi.fn(() => Promise.reject(refusal()));
        const { deletion } = renderSample(remove);

        deletion.ask(report);
        expect(await deletion.confirm(report)).toBe(false);
        expect(deletion.errors()[FORM]).toHaveLength(1);

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(dialog()?.hasAttribute('open')).toBe(false);
        expect(deletion.errors()).toEqual({});

        deletion.ask(report);
        expect(await deletion.confirm(report)).toBe(false);
        expect(screen.getByText('The file is in use.')).toBeTruthy();
        deletion.ask(report);
        expect(deletion.errors()).toEqual({});
        expect(screen.queryByText('The file is in use.')).toBeNull();
    });
});
