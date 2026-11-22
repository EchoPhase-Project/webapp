// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createSignal, type JSX } from 'solid-js';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { expectNoA11yViolations } from '@shared/testing/axe';
import RadioGroup from './RadioGroup';

// FieldError reads its messages through i18n.
const show = (ui: () => JSX.Element) =>
    render(() => <I18nProvider>{ui()}</I18nProvider>);

type Seen = 'Private' | 'Public';

function renderGroup(disabled = false) {
    const [seen, setSeen] = createSignal<Seen>('Private');
    show(() => (
        <RadioGroup
            id="seen"
            legend="Who sees it"
            name="seen"
            value={seen()}
            onChange={setSeen}
            disabled={disabled}
            options={[
                { value: 'Private', label: 'Private', description: 'You' },
                { value: 'Public', label: 'Public', description: 'Everyone' },
            ]}
        />
    ));
    return seen;
}

describe('RadioGroup', () => {
    it('names the group by its legend and each radio by its label', async () => {
        renderGroup();
        const group = screen.getByRole('group', { name: 'Who sees it' });
        expect(group.id).toBe('seen');
        const radios = screen.getAllByRole<HTMLInputElement>('radio');
        expect(radios.map((r) => r.name)).toEqual(['seen', 'seen']);
        expect(
            screen.getByRole<HTMLInputElement>('radio', { name: /Private/ })
                .checked
        ).toBe(true);
        await expectNoA11yViolations();
    });

    it('chooses the option clicked, its card included', () => {
        const seen = renderGroup();
        fireEvent.click(screen.getByText('Everyone'));
        expect(seen()).toBe('Public');
        expect(
            screen.getByRole<HTMLInputElement>('radio', { name: /Public/ })
                .checked
        ).toBe(true);
        expect(
            screen.getByRole<HTMLInputElement>('radio', { name: /Private/ })
                .checked
        ).toBe(false);
    });

    it('shows its errors under the options, linked to the group and marked on each radio', async () => {
        show(() => (
            <RadioGroup
                id="seen"
                legend="Who sees it"
                name="seen"
                value="Private"
                onChange={() => {}}
                errors={[{ code: 'Invalid', message: 'Pick another one.' }]}
                options={[
                    { value: 'Private', label: 'Private' },
                    { value: 'Public', label: 'Public' },
                ]}
            />
        ));
        const group = screen.getByRole('group', { name: 'Who sees it' });
        expect(
            document.getElementById(
                group.getAttribute('aria-describedby') ?? ''
            )?.textContent
        ).toBe('Pick another one.');
        for (const radio of screen.getAllByRole('radio'))
            expect(radio.getAttribute('aria-invalid')).toBe('true');
        // An error summary moves the focus to the group, so it is read out.
        group.focus();
        expect(document.activeElement).toBe(group);
        await expectNoA11yViolations();
    });

    it('is not invalid without errors', () => {
        renderGroup();
        const group = screen.getByRole('group', { name: 'Who sees it' });
        expect(group.hasAttribute('aria-describedby')).toBe(false);
        for (const radio of screen.getAllByRole('radio'))
            expect(radio.getAttribute('aria-invalid')).toBe('false');
    });

    it('disables every option while the group is disabled', () => {
        renderGroup(true);
        for (const radio of screen.getAllByRole<HTMLInputElement>('radio')) {
            expect(radio.disabled).toBe(true);
        }
    });
});
