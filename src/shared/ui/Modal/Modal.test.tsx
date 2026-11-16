// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { expectNoA11yViolations } from '@shared/testing/axe';
import Modal from './Modal';

describe('Modal', () => {
    it('cannot be dismissed when it says so: no close button, Escape ignored', async () => {
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
        await expectNoA11yViolations();
    });

    it('closes on Escape and a click beside it otherwise', async () => {
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
        await expectNoA11yViolations();
    });
});
