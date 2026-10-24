// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hotkeys } from './hotkeys';

const key = (type: 'keydown' | 'keyup', code: string) =>
    window.dispatchEvent(new KeyboardEvent(type, { code }));

describe('Hotkeys', () => {
    afterEach(() => Hotkeys.clear());

    it('fires when the last key of the combination is released', () => {
        const run = vi.fn();
        Hotkeys.add(['ControlLeft', 'KeyK'], run);

        key('keydown', 'ControlLeft');
        key('keydown', 'KeyK');
        key('keyup', 'KeyK');
        expect(run).toHaveBeenCalledTimes(1);

        key('keyup', 'ControlLeft');
        key('keydown', 'KeyK');
        key('keyup', 'KeyK');
        expect(run).toHaveBeenCalledTimes(1);
    });

    it('forgets keys held when the window loses focus', () => {
        const run = vi.fn();
        Hotkeys.add(['ShiftLeft', 'KeyP'], run);

        key('keydown', 'ShiftLeft');
        window.dispatchEvent(new Event('blur'));
        key('keydown', 'KeyP');
        key('keyup', 'KeyP');
        expect(run).not.toHaveBeenCalled();
    });

    it('listens only while something is registered', () => {
        const add = vi.spyOn(window, 'addEventListener');
        const remove = vi.spyOn(window, 'removeEventListener');

        const off = Hotkeys.add(['KeyA'], () => {});
        Hotkeys.add(['KeyB'], () => {});
        expect(add).toHaveBeenCalledTimes(3);

        off();
        expect(remove).not.toHaveBeenCalled();
        Hotkeys.clear();
        expect(remove).toHaveBeenCalledTimes(3);
        expect(Hotkeys.pressedKeys()).toEqual([]);
    });
});
