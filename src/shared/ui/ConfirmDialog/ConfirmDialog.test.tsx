// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { I18nProvider } from '@shared/i18n/i18n-context';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
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

    it('given an item, is open while there is one and hands it on', () => {
        const onConfirm = vi.fn();
        const [item, setItem] = createSignal<{ name: string } | null>(null);
        render(() => (
            <I18nProvider>
                <ConfirmDialog
                    item={item()}
                    title="Delete it?"
                    confirm="Delete"
                    onConfirm={onConfirm}
                    onCancel={() => setItem(null)}
                >
                    {(file) => <p>{file.name} is gone for good.</p>}
                </ConfirmDialog>
            </I18nProvider>
        ));
        const dialog = document.querySelector('dialog');
        expect(dialog?.hasAttribute('open')).toBe(false);

        setItem({ name: 'notes.txt' });
        expect(dialog?.hasAttribute('open')).toBe(true);
        expect(screen.getByText('notes.txt is gone for good.')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(onConfirm).toHaveBeenCalledWith({ name: 'notes.txt' });
    });
});
