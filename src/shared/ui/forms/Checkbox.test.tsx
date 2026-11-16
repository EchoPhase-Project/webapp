// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createSignal } from 'solid-js';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { expectNoA11yViolations } from '@shared/testing/axe';
import Checkbox from './Checkbox';

function renderBox() {
    const [on, setOn] = createSignal(false);
    render(() => (
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

    it('can be shown but not changed', () => {
        render(() => (
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
