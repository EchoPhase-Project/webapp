// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createSignal } from 'solid-js';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { expectNoA11yViolations } from '@shared/testing/axe';
import { renderPage } from '@shared/testing/render-page';
import { createForm } from '@shared/ui/forms/form';
import Switch from './Switch';

describe('Switch', () => {
    it('follows its owner: on when the owner says so, back when it does not', async () => {
        const [on, setOn] = createSignal(false);
        let accept = true;
        render(() => (
            <Switch
                checked={on()}
                label="Run on triggers"
                onChange={(v) => accept && setOn(v)}
            />
        ));
        const box = screen.getByRole<HTMLInputElement>('switch');

        fireEvent.click(box);
        expect(box.checked).toBe(true);

        // A save that failed: the owner keeps the old value, and so does the switch.
        accept = false;
        fireEvent.click(box);
        expect(box.checked).toBe(true);
        await expectNoA11yViolations();
    });

    it('shows the errors of a form binding under the row, wired to the box', async () => {
        let clear = () => {};
        renderPage(() => {
            const form = createForm({
                id: 'note',
                initial: () => ({ pinned: false }),
            });
            form.setErrors({
                pinned: [
                    {
                        code: 'dev_example',
                        message: 'Too many pinned notes.',
                        field: 'pinned',
                    },
                ],
            });
            clear = () => form.setErrors({});
            return (
                <>
                    <Switch {...form.toggle('pinned')} label="Pinned" />
                </>
            );
        });
        const box = screen.getByRole<HTMLInputElement>('switch', {
            name: 'Pinned',
        });
        expect(box.id).toBe('note-pinned');
        expect(box.name).toBe('pinned');
        expect(box.getAttribute('aria-invalid')).toBe('true');
        const list = document.getElementById(
            box.getAttribute('aria-describedby') ?? ''
        );
        expect(list?.textContent).toBe('Too many pinned notes.');
        expect(box.closest('.switch-row')?.nextElementSibling).toBe(list);

        // The binding follows: a click changes the form's value.
        fireEvent.click(box);
        expect(box.checked).toBe(true);
        await expectNoA11yViolations();

        clear();
        expect(box.getAttribute('aria-invalid')).toBe('false');
        expect(box.hasAttribute('aria-describedby')).toBe(false);
    });
});
