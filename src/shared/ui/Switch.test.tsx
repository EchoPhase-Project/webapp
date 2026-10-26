// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { createSignal } from 'solid-js';
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import Switch from './Switch';

describe('Switch', () => {
    afterEach(cleanup);

    it('follows its owner: on when the owner says so, back when it does not', () => {
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
    });
});
