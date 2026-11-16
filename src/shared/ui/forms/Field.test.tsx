// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { expectNoA11yViolations } from '@shared/testing/axe';
import Field from './Field';

const Icon = (props: { class?: string }) => (
    <svg class={props.class} data-testid="icon" />
);

describe('Field', () => {
    it('labels the input, shows the hint as placeholder, and the icon', async () => {
        render(() => (
            <I18nProvider>
                <Field id="f-name" name="name" label="Name" icon={Icon} />
            </I18nProvider>
        ));
        const input = screen.getByLabelText('Name');
        expect(input.getAttribute('placeholder')).toBe('Name');
        expect(input.getAttribute('aria-invalid')).toBe('false');
        expect(screen.getByTestId('icon').getAttribute('class')).toBe(
            'field-icon'
        );
        await expectNoA11yViolations();
    });

    it('puts the errors right under the input and points the input at them', () => {
        render(() => (
            <I18nProvider>
                <Field
                    id="f-name"
                    name="name"
                    label="Name"
                    showLabel
                    errors={[{ code: 'Taken', message: 'Name is taken.' }]}
                />
            </I18nProvider>
        ));
        const input = screen.getByLabelText('Name');
        expect(input.getAttribute('placeholder')).toBeNull();
        expect(input.getAttribute('aria-invalid')).toBe('true');
        const list = document.getElementById(
            input.getAttribute('aria-describedby')!
        )!;
        expect(list.textContent).toBe('Name is taken.');
        // In the same wrapper, after the field.
        expect(input.closest('.field')!.nextElementSibling).toBe(list);
    });
});
