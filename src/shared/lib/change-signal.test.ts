import { describe, expect, it } from 'vitest';
import { createChangeSignal } from './change-signal';

describe('createChangeSignal', () => {
    it('counts the changes', () => {
        const signal = createChangeSignal();
        expect(signal.version()).toBe(0);
        signal.changed();
        signal.changed();
        expect(signal.version()).toBe(2);
    });
});
