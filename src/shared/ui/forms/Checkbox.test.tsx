// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createSignal, type JSX } from 'solid-js';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { expectNoA11yViolations } from '@shared/testing/axe';
import Checkbox from './Checkbox';

// FieldError reads its messages through i18n.
const show = (ui: () => JSX.Element) =>
    render(() => <I18nProvider>{ui()}</I18nProvider>);

function renderBox() {
    const [on, setOn] = createSignal(false);
    show(() => (
        <Checkbox
            checked={on()}
            onChange={setOn}
            label={
                <>
                    Daily report <span>main</span>
                </>
            }
            description="v3"
        />
    ));
    return on;
}

describe('Checkbox', () => {
    it('is named by its label and ticked by a click anywhere on the card', async () => {
        const on = renderBox();
        const box = screen.getByRole<HTMLInputElement>('checkbox', {
            name: /Daily report/,
        });
        expect(box.checked).toBe(false);

        fireEvent.click(screen.getByText('v3'));
        expect(on()).toBe(true);
        expect(box.checked).toBe(true);

        fireEvent.click(box);
        expect(on()).toBe(false);
        await expectNoA11yViolations();
    });

    it('shows its errors under the card, linked to the box', async () => {
        show(() => (
            <Checkbox
                id="replace"
                checked={false}
                onChange={() => {}}
                label="New secret"
                errors={[{ code: 'Invalid', message: 'Not now.' }]}
            />
        ));
        const box = screen.getByRole('checkbox', { name: 'New secret' });
        expect(box.id).toBe('replace');
        expect(box.getAttribute('aria-invalid')).toBe('true');
        expect(
            document.getElementById(box.getAttribute('aria-describedby') ?? '')
                ?.textContent
        ).toBe('Not now.');
        await expectNoA11yViolations();
    });

    it('is not invalid without errors', () => {
        renderBox();
        const box = screen.getByRole('checkbox', { name: /Daily report/ });
        expect(box.getAttribute('aria-invalid')).toBe('false');
        expect(box.hasAttribute('aria-describedby')).toBe(false);
    });

    it('can be shown but not changed', () => {
        show(() => (
            <Checkbox
                checked={true}
                onChange={() => {}}
                label="New secret"
                disabled
            />
        ));
        const box = screen.getByRole<HTMLInputElement>('checkbox', {
            name: 'New secret',
        });
        expect(box.disabled).toBe(true);
        expect(box.checked).toBe(true);
    });
});
