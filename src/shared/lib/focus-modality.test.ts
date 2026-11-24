// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { watchFocusModality } from './focus-modality';

describe('watchFocusModality', () => {
    let stop = () => {};
    afterEach(() => {
        stop();
        document.body.innerHTML = '';
    });
    const by = () => document.documentElement.dataset.focusBy;

    it('says the keyboard brought the focus after a key, the pointer after a click', () => {
        document.body.innerHTML = '<input id="a" /><input id="b" />';
        const [a, b] = document.querySelectorAll('input');
        stop = watchFocusModality();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
        a?.focus();
        expect(by()).toBe('keyboard');

        b?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        b?.focus();
        expect(by()).toBe('pointer');
    });

    it('keeps "pointer" while the user types in a field that a click focused', () => {
        document.body.innerHTML = '<input />';
        const input = document.querySelector('input');
        stop = watchFocusModality();
        input?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        input?.focus();
        input?.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'a', bubbles: true })
        );
        expect(by()).toBe('pointer');
    });

    it('takes the attribute away when it stops', () => {
        stop = watchFocusModality();
        document.body.innerHTML = '<input />';
        document.querySelector('input')?.focus();
        expect(by()).toBe('keyboard');
        stop();
        expect(by()).toBeUndefined();
    });
});
