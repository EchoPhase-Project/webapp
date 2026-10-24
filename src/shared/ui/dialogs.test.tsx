// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { I18nProvider } from '@shared/i18n/i18n-context';
import ConfirmDialog from './ConfirmDialog';
import Modal from './Modal';

describe('ConfirmDialog', () => {
    afterEach(cleanup);

    it('starts on Cancel and acts only on the red button', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(() => (
            <I18nProvider>
                <ConfirmDialog
                    open
                    title="Delete it?"
                    confirm="Delete"
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                >
                    <p>It is gone for good.</p>
                </ConfirmDialog>
            </I18nProvider>
        ));

        expect(document.querySelector('dialog')!.getAttribute('role')).toBe(
            'alertdialog'
        );
        expect(document.activeElement?.textContent).toBe('Cancel');

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onCancel).toHaveBeenCalledOnce();
        expect(onConfirm).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(onConfirm).toHaveBeenCalledOnce();
    });
});

describe('Modal', () => {
    afterEach(cleanup);

    it('cannot be dismissed when it says so: no close button, Escape ignored', () => {
        const onClose = vi.fn();
        render(() => (
            <I18nProvider>
                <Modal
                    open
                    dismissible={false}
                    title="Under maintenance"
                    onClose={onClose}
                >
                    <p>Back soon.</p>
                </Modal>
            </I18nProvider>
        ));

        expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
        const dialog = document.querySelector('dialog')!;
        fireEvent(dialog, new Event('cancel', { cancelable: true }));
        fireEvent.click(dialog);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('closes on Escape and a click beside it otherwise', () => {
        const onClose = vi.fn();
        render(() => (
            <I18nProvider>
                <Modal open title="New client" onClose={onClose}>
                    <input aria-label="Name" />
                </Modal>
            </I18nProvider>
        ));

        expect(document.activeElement).toBe(screen.getByLabelText('Name'));
        const dialog = document.querySelector('dialog')!;
        fireEvent(dialog, new Event('cancel', { cancelable: true }));
        fireEvent.click(dialog);
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});
