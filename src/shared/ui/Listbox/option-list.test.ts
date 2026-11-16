import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'solid-js';
import {
    createOptionList,
    hasValue,
    indexOfValue,
    toggleValue,
    TYPE_AHEAD_MS,
    type ListOption,
    type OptionList,
} from './option-list';

const option = (label: string, disabled = false): ListOption<string> => ({
    value: label.toLowerCase(),
    label,
    disabled,
});

let dispose: () => void = () => undefined;

function listOf(options: ListOption<string>[]): OptionList {
    return createRoot((d) => {
        dispose = d;
        return createOptionList(() => options);
    });
}

afterEach(() => dispose());

describe('createOptionList', () => {
    it('gives each option its own id and starts with none active', () => {
        const list = listOf([option('A'), option('B')]);
        expect(list.optionId(0)).not.toBe(list.optionId(1));
        expect(list.optionId(0)).toContain(list.id);
        expect(list.active()).toBe(-1);
        expect(list.activeId()).toBeUndefined();
        list.setActive(1, 'keys');
        expect(list.activeId()).toBe(list.optionId(1));
    });

    it('moves one step without wrapping around', () => {
        const list = listOf([option('A'), option('B'), option('C')]);
        expect(list.move('ArrowDown')).toBe(0);
        expect(list.move('ArrowDown')).toBe(1);
        expect(list.move('ArrowDown')).toBe(2);
        expect(list.move('ArrowDown')).toBe(2);
        expect(list.move('ArrowUp')).toBe(1);
        expect(list.move('ArrowUp')).toBe(0);
        expect(list.move('ArrowUp')).toBe(0);
        expect(list.move('Enter')).toBeUndefined();
    });

    it('skips disabled options, at the ends too', () => {
        const list = listOf([
            option('A', true),
            option('B'),
            option('C', true),
            option('D'),
            option('E', true),
        ]);
        expect(list.firstEnabled()).toBe(1);
        expect(list.move('Home')).toBe(1);
        expect(list.move('ArrowDown')).toBe(3);
        expect(list.move('ArrowDown')).toBe(3);
        expect(list.move('End')).toBe(3);
        expect(list.move('ArrowUp')).toBe(1);
        expect(list.move('ArrowUp')).toBe(1);
        expect(list.enabled(0)).toBe(false);
        expect(list.enabled(9)).toBe(false);
    });

    it('pages by ten and stops at the ends', () => {
        const options = Array.from({ length: 25 }, (_, i) => option(`O${i}`));
        options[10] = option('O10', true);
        const list = listOf(options);
        list.setActive(0, 'keys');
        expect(list.move('PageDown')).toBe(9);
        expect(list.move('PageDown')).toBe(19);
        expect(list.move('PageDown')).toBe(24);
        expect(list.move('PageUp')).toBe(14);
        expect(list.move('PageUp')).toBe(4);
        expect(list.move('PageUp')).toBe(0);
    });

    it('forgets an active index that the options no longer have', () => {
        const list = listOf([option('A')]);
        list.setActive(3, 'keys');
        expect(list.active()).toBe(-1);
    });
});

describe('type-ahead', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const fruits = () =>
        listOf([
            option('Apple'),
            option('Banana'),
            option('Blackberry', true),
            option('Blueberry'),
            option('Cherry'),
        ]);

    it('finds the label that starts with the typed letters, any case', () => {
        const list = fruits();
        expect(list.typeAhead('B')).toBe(1);
        expect(list.typing()).toBe(true);
        expect(list.typeAhead('l')).toBe(3);
        vi.advanceTimersByTime(TYPE_AHEAD_MS);
        expect(list.typing()).toBe(false);
        expect(list.typeAhead('c')).toBe(4);
        expect(list.typeAhead('x')).toBeUndefined();
        expect(list.active()).toBe(4);
    });

    it('goes through the options of one letter typed again', () => {
        const list = fruits();
        expect(list.typeAhead('b')).toBe(1);
        expect(list.typeAhead('b')).toBe(3);
        expect(list.typeAhead('b')).toBe(1);
        vi.advanceTimersByTime(TYPE_AHEAD_MS);
        expect(list.typeAhead('b')).toBe(3);
    });
});

describe('value helpers', () => {
    it('compare with Object.is', () => {
        expect(hasValue([NaN], NaN)).toBe(true);
        expect(hasValue([{}], {})).toBe(false);
        expect(toggleValue([1, 2], 2)).toEqual([1]);
        expect(toggleValue([1], 2)).toEqual([1, 2]);
        expect(indexOfValue([option('A'), option('B')], 'b')).toBe(1);
        expect(indexOfValue([option('A')], 'z')).toBe(-1);
    });
});
