// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { expectNoA11yViolations } from '@shared/testing/axe';
import Listbox from './Listbox';
import { TYPE_AHEAD_MS, type ListOption } from './option-list';

const fruits: ListOption<string>[] = [
    { value: 'apple', label: 'Apple', hint: 'Red or green' },
    { value: 'banana', label: 'Banana' },
    { value: 'blackberry', label: 'Blackberry', disabled: true },
    { value: 'blueberry', label: 'Blueberry' },
    { value: 'cherry', label: 'Cherry' },
];

function renderSingle(initial?: string, options = fruits) {
    const [value, setValue] = createSignal<string | undefined>(initial);
    const onChange = vi.fn((v: string) => setValue(v));
    render(() => (
        <Listbox
            label="Fruit"
            options={options}
            value={value()}
            onChange={onChange}
        />
    ));
    return { value, onChange, list: screen.getByRole('listbox') };
}

function renderMultiple(initial: string[] = []) {
    const [value, setValue] = createSignal<string[]>(initial);
    const onChange = vi.fn((v: string[]) => setValue(v));
    render(() => (
        <>
            <span id="basket">Basket</span>
            <Listbox
                multiple
                labelledBy="basket"
                options={fruits}
                value={value()}
                onChange={onChange}
            />
        </>
    ));
    return { value, onChange, list: screen.getByRole('listbox') };
}

const option = (name: string) => screen.getByRole('option', { name });
const key = (el: HTMLElement, k: string, init: KeyboardEventInit = {}) =>
    fireEvent.keyDown(el, { key: k, ...init });
// The label of the option that aria-activedescendant points at.
const active = (list: HTMLElement) =>
    document
        .getElementById(list.getAttribute('aria-activedescendant') ?? '')
        ?.querySelector('.listbox-label')?.textContent;

describe('Listbox', () => {
    it('marks up a named listbox with its options', async () => {
        const { list } = renderSingle('banana');
        expect(screen.getByRole('listbox', { name: 'Fruit' })).toBe(list);
        expect(list.tabIndex).toBe(0);
        expect(list.hasAttribute('aria-multiselectable')).toBe(false);
        expect(option('Banana').getAttribute('aria-selected')).toBe('true');
        expect(option('Apple').getAttribute('aria-selected')).toBe('false');
        expect(option('Blackberry').getAttribute('aria-disabled')).toBe('true');
        expect(option('Apple').hasAttribute('aria-disabled')).toBe(false);
        // The hint describes the option; the label alone names it.
        expect(option('Apple').getAttribute('aria-describedby')).toBeTruthy();
        expect(screen.getByText('Red or green')).toBeTruthy();
        // The options take no focus; the list points at the active one.
        expect(option('Apple').hasAttribute('tabindex')).toBe(false);

        list.focus();
        expect(active(list)).toBe('Banana');
        await expectNoA11yViolations();
    });

    describe('one choice', () => {
        it('starts at the first enabled option when none is selected', () => {
            const { list, onChange } = renderSingle(undefined, [
                { value: 'x', label: 'X', disabled: true },
                ...fruits,
            ]);
            list.focus();
            expect(active(list)).toBe('Apple');
            expect(onChange).not.toHaveBeenCalled();
        });

        it('selects as the arrows move, skips disabled, does not wrap', () => {
            const { list, value, onChange } = renderSingle('apple');
            list.focus();
            key(list, 'ArrowUp');
            expect(onChange).not.toHaveBeenCalled();
            key(list, 'ArrowDown');
            expect(value()).toBe('banana');
            key(list, 'ArrowDown');
            expect(value()).toBe('blueberry');
            expect(active(list)).toBe('Blueberry');
            key(list, 'ArrowUp');
            expect(value()).toBe('banana');
            key(list, 'End');
            expect(value()).toBe('cherry');
            key(list, 'ArrowDown');
            key(list, 'Home');
            expect(value()).toBe('apple');
            expect(onChange).toHaveBeenCalledTimes(5);
        });

        it('pages by ten', () => {
            const many = Array.from({ length: 30 }, (_, i) => ({
                value: i,
                label: `Item ${i}`,
            }));
            const onChange = vi.fn();
            render(() => (
                <Listbox
                    label="Items"
                    options={many}
                    value={0}
                    onChange={onChange}
                />
            ));
            const list = screen.getByRole('listbox');
            list.focus();
            key(list, 'PageDown');
            expect(onChange).toHaveBeenLastCalledWith(10);
            key(list, 'PageDown');
            key(list, 'PageDown');
            expect(onChange).toHaveBeenLastCalledWith(29);
            key(list, 'PageUp');
            expect(onChange).toHaveBeenLastCalledWith(19);
        });

        it('selects on click, but not a disabled option or the same one', () => {
            const { value, onChange } = renderSingle('apple');
            fireEvent.click(option('Cherry'));
            expect(value()).toBe('cherry');
            fireEvent.click(option('Blackberry'));
            fireEvent.click(option('Cherry'));
            expect(value()).toBe('cherry');
            expect(onChange).toHaveBeenCalledTimes(1);
        });

        it('ignores Space and keys with Ctrl or Alt', () => {
            const { list, onChange } = renderSingle('apple');
            list.focus();
            key(list, ' ');
            key(list, 'ArrowDown', { altKey: true });
            key(list, 'ArrowDown', { ctrlKey: true });
            key(list, 'a', { ctrlKey: true });
            expect(onChange).not.toHaveBeenCalled();
        });

        describe('type-ahead', () => {
            beforeEach(() => vi.useFakeTimers());
            afterEach(() => vi.useRealTimers());

            it('goes to the typed label; one letter again goes on', () => {
                const { list, value } = renderSingle('apple');
                list.focus();
                key(list, 'c');
                expect(value()).toBe('cherry');
                vi.advanceTimersByTime(TYPE_AHEAD_MS);
                key(list, 'B');
                expect(value()).toBe('banana');
                key(list, 'b');
                // Blackberry is disabled.
                expect(value()).toBe('blueberry');
                key(list, 'b');
                expect(value()).toBe('banana');
                vi.advanceTimersByTime(TYPE_AHEAD_MS);
                key(list, 'b');
                key(list, 'l');
                key(list, 'u');
                expect(value()).toBe('blueberry');
                key(list, 'z');
                expect(value()).toBe('blueberry');
            });
        });
    });

    describe('more than one choice', () => {
        it('marks the list as multiselectable', async () => {
            const { list } = renderMultiple(['banana']);
            expect(screen.getByRole('listbox', { name: 'Basket' })).toBe(list);
            expect(list.getAttribute('aria-multiselectable')).toBe('true');
            list.focus();
            expect(active(list)).toBe('Banana');
            await expectNoA11yViolations();
        });

        it('moves without selecting; Space toggles the active option', () => {
            const { list, value, onChange } = renderMultiple();
            list.focus();
            expect(active(list)).toBe('Apple');
            key(list, 'ArrowDown');
            key(list, 'ArrowDown');
            key(list, 'End');
            key(list, 'Home');
            key(list, 'PageDown');
            key(list, 'PageUp');
            expect(onChange).not.toHaveBeenCalled();
            key(list, 'ArrowDown');
            key(list, ' ');
            expect(value()).toEqual(['banana']);
            key(list, 'End');
            key(list, ' ');
            expect(value()).toEqual(['banana', 'cherry']);
            key(list, ' ');
            expect(value()).toEqual(['banana']);
            expect(option('Banana').getAttribute('aria-selected')).toBe('true');
        });

        it('extends the selection with Shift and an arrow', () => {
            const { list, value, onChange } = renderMultiple(['apple']);
            list.focus();
            key(list, 'ArrowDown', { shiftKey: true });
            expect(value()).toEqual(['apple', 'banana']);
            key(list, 'ArrowDown', { shiftKey: true });
            expect(value()).toEqual(['apple', 'banana', 'blueberry']);
            key(list, 'ArrowUp', { shiftKey: true });
            // Banana is selected already: nothing changes.
            expect(onChange).toHaveBeenCalledTimes(2);
            key(list, 'ArrowUp', { shiftKey: true });
            key(list, 'ArrowUp', { shiftKey: true });
            expect(onChange).toHaveBeenCalledTimes(2);
        });

        it('selects all enabled options with Ctrl+A, then none', () => {
            const { list, value } = renderMultiple(['banana']);
            list.focus();
            key(list, 'a', { ctrlKey: true });
            expect(value()).toEqual(['banana', 'apple', 'blueberry', 'cherry']);
            key(list, 'A', { metaKey: true });
            expect(value()).toEqual([]);
        });

        it('toggles on click', () => {
            const { value, onChange } = renderMultiple(['apple']);
            fireEvent.click(option('Cherry'));
            expect(value()).toEqual(['apple', 'cherry']);
            fireEvent.click(option('Apple'));
            expect(value()).toEqual(['cherry']);
            fireEvent.click(option('Blackberry'));
            expect(onChange).toHaveBeenCalledTimes(2);
        });

        describe('type-ahead', () => {
            beforeEach(() => vi.useFakeTimers());
            afterEach(() => vi.useRealTimers());

            it('moves only; a Space in a search is a letter', () => {
                const many: ListOption<string>[] = [
                    { value: 'a', label: 'New York' },
                    { value: 'b', label: 'New Delhi' },
                ];
                const onChange = vi.fn();
                render(() => (
                    <Listbox
                        multiple
                        label="Cities"
                        options={many}
                        value={[]}
                        onChange={onChange}
                    />
                ));
                const list = screen.getByRole('listbox');
                list.focus();
                for (const c of 'new d') key(list, c);
                expect(active(list)).toBe('New Delhi');
                expect(onChange).not.toHaveBeenCalled();
                vi.advanceTimersByTime(TYPE_AHEAD_MS);
                key(list, ' ');
                expect(onChange).toHaveBeenCalledWith(['b']);
            });
        });
    });

    describe('the outline of the active option', () => {
        const keys = (name: string) =>
            option(name).classList.contains('listbox-option--keys');
        const anyKeys = () =>
            document.querySelector('.listbox-option--keys') !== null;

        it('shows for the keyboard: focus by Tab, the arrows', () => {
            const { list } = renderSingle('banana');
            list.focus();
            expect(keys('Banana')).toBe(true);
            key(list, 'ArrowDown');
            expect(keys('Blueberry')).toBe(true);
            expect(keys('Banana')).toBe(false);
        });

        it('does not show after a click; the next arrow brings it back', () => {
            const { list } = renderSingle('banana');
            // A press gives the focus before the click.
            fireEvent.mouseDown(option('Cherry'));
            list.focus();
            expect(active(list)).toBe('Banana');
            expect(anyKeys()).toBe(false);
            fireEvent.click(option('Cherry'));
            expect(active(list)).toBe('Cherry');
            expect(
                option('Cherry').classList.contains('listbox-option--active')
            ).toBe(true);
            expect(anyKeys()).toBe(false);
            key(list, 'ArrowUp');
            expect(keys('Blueberry')).toBe(true);
        });

        it('does not show after a click with more than one choice', () => {
            const { list } = renderMultiple();
            list.focus();
            fireEvent.mouseDown(option('Banana'));
            fireEvent.click(option('Banana'));
            expect(active(list)).toBe('Banana');
            expect(anyKeys()).toBe(false);
            key(list, 'End');
            expect(keys('Cherry')).toBe(true);
        });
    });

    it('scrolls the active option into view', () => {
        const scroll = vi.fn();
        Element.prototype.scrollIntoView = scroll;
        try {
            const { list } = renderSingle('apple');
            list.focus();
            key(list, 'End');
            expect(scroll).toHaveBeenLastCalledWith({ block: 'nearest' });
            expect(scroll.mock.contexts.at(-1)).toBe(option('Cherry'));
        } finally {
            // jsdom has none.
            Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
        }
    });
});
