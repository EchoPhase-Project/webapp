import { createRoot } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDebounced } from './debounced';

describe('createDebounced', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('runs only the last function, once the pause is long enough', () => {
        const debounce = createRoot(() => createDebounced(250));
        const first = vi.fn();
        const last = vi.fn();

        debounce(first);
        vi.advanceTimersByTime(200);
        debounce(last);
        vi.advanceTimersByTime(200);
        expect(last).not.toHaveBeenCalled();

        vi.advanceTimersByTime(50);
        expect(first).not.toHaveBeenCalled();
        expect(last).toHaveBeenCalledOnce();
    });

    it('drops the waiting function on cancel and when its owner goes', () => {
        const run = vi.fn();
        createRoot((dispose) => {
            const debounce = createDebounced(250);
            debounce(run);
            debounce.cancel();
            vi.advanceTimersByTime(250);

            debounce(run);
            dispose();
        });
        vi.advanceTimersByTime(250);
        expect(run).not.toHaveBeenCalled();
    });
});
