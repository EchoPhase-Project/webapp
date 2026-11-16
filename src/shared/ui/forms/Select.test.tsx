// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createSignal } from 'solid-js';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { I18nProvider } from '@shared/i18n/i18n-context';
import type { ErrorItem } from '@shared/api/types';
import { expectNoA11yViolations } from '@shared/testing/axe';
import Select from './Select';

type Choice = '' | 'alerts' | 'cleanup';

function renderSelect(errors?: ErrorItem[]) {
    const [value, setValue] = createSignal<Choice>('');
    render(() => (
        <I18nProvider>
            <Select
                id="s-errors"
                label="When a run fails"
                value={value()}
                onChange={setValue}
                options={[
                    { value: '', label: 'None' },
                    { value: 'alerts', label: 'Alerts' },
                    { value: 'cleanup', label: 'Cleanup', disabled: true },
                ]}
                errors={errors}
            />
        </I18nProvider>
    ));
    return value;
}

describe('Select', () => {
    it('labels the list, shows the value and reports a choice', async () => {
        const value = renderSelect();
        const select = screen.getByRole<HTMLSelectElement>('combobox', {
            name: 'When a run fails',
        });
        expect(select.value).toBe('');
        expect(select.getAttribute('aria-invalid')).toBe('false');
        expect(
            screen.getByRole<HTMLOptionElement>('option', { name: 'Cleanup' })
                .disabled
        ).toBe(true);

        select.value = 'alerts';
        fireEvent.change(select);
        expect(value()).toBe('alerts');
        await expectNoA11yViolations();
    });

    it('draws its own chevron, hidden from screen readers', () => {
        renderSelect();
        const select = screen.getByRole('combobox');
        const arrow = select.nextElementSibling;
        expect(arrow?.classList.contains('select-arrow')).toBe(true);
        expect(arrow?.getAttribute('aria-hidden')).toBe('true');
    });

    it('puts the errors right under it and points the select at them', () => {
        renderSelect([{ code: 'NoTrigger', message: 'It needs a trigger.' }]);
        const select = screen.getByRole('combobox', {
            name: 'When a run fails',
        });
        expect(select.getAttribute('aria-invalid')).toBe('true');
        const id = select.getAttribute('aria-describedby');
        expect(id).not.toBeNull();
        const list = document.getElementById(id ?? '');
        expect(list?.textContent).toBe('It needs a trigger.');
        expect(select.closest('.select-box')?.nextElementSibling).toBe(list);
    });
});
