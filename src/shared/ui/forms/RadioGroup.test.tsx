// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createSignal } from 'solid-js';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { expectNoA11yViolations } from '@shared/testing/axe';
import RadioGroup from './RadioGroup';

type Seen = 'Private' | 'Public';

function renderGroup(disabled = false) {
    const [seen, setSeen] = createSignal<Seen>('Private');
    render(() => (
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

    it('disables every option while the group is disabled', () => {
        renderGroup(true);
        for (const radio of screen.getAllByRole<HTMLInputElement>('radio')) {
            expect(radio.disabled).toBe(true);
        }
    });
});
