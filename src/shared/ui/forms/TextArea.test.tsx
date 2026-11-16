// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { expectNoA11yViolations } from '@shared/testing/axe';
import TextArea from './TextArea';

describe('TextArea', () => {
    it('labels the text area for screen readers and passes its attributes on', async () => {
        render(() => (
            <I18nProvider>
                <TextArea id="t-body" name="body" label="Body" rows={4} />
            </I18nProvider>
        ));
        const area = screen.getByLabelText('Body');
        expect(area.tagName).toBe('TEXTAREA');
        expect(area.getAttribute('name')).toBe('body');
        expect(area.getAttribute('rows')).toBe('4');
        expect(area.className).toBe('field-textarea');
        expect(area.getAttribute('aria-invalid')).toBe('false');
        expect(screen.getByText('Body').className).toBe('visually-hidden');
        await expectNoA11yViolations();
    });

    it('shows the label above it and the errors right under it', () => {
        render(() => (
            <I18nProvider>
                <TextArea
                    id="t-body"
                    label="Body"
                    showLabel
                    errors={[{ code: 'TooLong', message: 'Too long.' }]}
                />
            </I18nProvider>
        ));
        const area = screen.getByLabelText('Body');
        expect(screen.getByText('Body').className).toBe('field-label');
        expect(area.classList.contains('invalid')).toBe(true);
        expect(area.getAttribute('aria-invalid')).toBe('true');
        const list = document.getElementById(
            area.getAttribute('aria-describedby')!
        )!;
        expect(list.textContent).toBe('Too long.');
        expect(area.nextElementSibling).toBe(list);
    });
});
