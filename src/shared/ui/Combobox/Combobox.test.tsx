// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { expectNoA11yViolations } from '@shared/testing/axe';
import { TYPE_AHEAD_MS, type ListOption } from '@shared/ui/Listbox';
import Combobox from './Combobox';

const languages: ListOption<string>[] = [
    { value: 'en', label: 'English', short: 'EN' },
    { value: 'ro', label: 'Română', short: 'RO' },
    { value: 'ru', label: 'Русский', short: 'RU' },
];

const fruits: ListOption<string>[] = [
    { value: 'apple', label: 'Apple', hint: 'Red or green' },
    { value: 'banana', label: 'Banana' },
    { value: 'blackberry', label: 'Blackberry', disabled: true },
    { value: 'blueberry', label: 'Blueberry' },
    { value: 'cherry', label: 'Cherry' },
];

function renderCombobox(initial?: string, options = fruits) {
    const [value, setValue] = createSignal<string | undefined>(initial);
    const onChange = vi.fn((v: string) => setValue(v));
    render(() => (
        <>
            <Combobox
                label="Fruit"
                options={options}
                value={value()}
                onChange={onChange}
                placeholder="Pick one"
            />
            <button type="button">Elsewhere</button>
        </>
    ));
    const button = screen.getByRole('combobox');
    button.focus();
    return { value, onChange, button };
}

const key = (el: HTMLElement, k: string, init: KeyboardEventInit = {}) =>
    fireEvent.keyDown(el, { key: k, ...init });
const listbox = () => screen.queryByRole('listbox');
const option = (name: string) => screen.getByRole('option', { name });
// The label of the option that aria-activedescendant points at.
const active = (button: HTMLElement) =>
    document
        .getElementById(button.getAttribute('aria-activedescendant') ?? '')
        ?.querySelector('.combobox-label')?.textContent;

describe('Combobox', () => {
    it('marks up a closed combobox button', async () => {
        const { button } = renderCombobox('banana');
        expect(button.tagName).toBe('BUTTON');
        expect(button.getAttribute('aria-haspopup')).toBe('listbox');
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(button.hasAttribute('aria-controls')).toBe(false);
        expect(button.hasAttribute('aria-activedescendant')).toBe(false);
        expect(button.textContent).toContain('Banana');
        expect(listbox()).toBeNull();
        await expectNoA11yViolations();
    });

    it('marks up the open list', async () => {
        const { button } = renderCombobox('banana');
        fireEvent.click(button);
        const list = screen.getByRole('listbox', { name: 'Fruit' });
        expect(button.getAttribute('aria-expanded')).toBe('true');
        expect(button.getAttribute('aria-controls')).toBe(list.id);
        expect(list.tabIndex).toBe(-1);
        expect(active(button)).toBe('Banana');
        expect(option('Banana').getAttribute('aria-selected')).toBe('true');
        expect(option('Apple').getAttribute('aria-selected')).toBe('false');
        expect(option('Blackberry').getAttribute('aria-disabled')).toBe('true');
        expect(option('Apple').getAttribute('aria-describedby')).toBeTruthy();
        expect(option('Apple').hasAttribute('tabindex')).toBe(false);
        await expectNoA11yViolations();
    });

    describe('the name of the button', () => {
        it('shows the short label and names the full one', async () => {
            render(() => (
                <Combobox
                    label="Language"
                    options={languages}
                    value="ro"
                    onChange={() => {}}
                />
            ));
            const button = screen.getByRole('combobox', {
                name: 'Language: Română',
            });
            expect(button.querySelector('.combobox-value')?.textContent).toBe(
                'RO'
            );
            fireEvent.click(button);
            expect(screen.getByRole('listbox', { name: 'Language' })).toBe(
                listbox()
            );
            await expectNoA11yViolations();
        });

        it('adds the full label to a visible label', async () => {
            render(() => (
                <>
                    <span id="lang">Language</span>
                    <Combobox
                        labelledBy="lang"
                        options={languages}
                        value="ru"
                        onChange={() => {}}
                    />
                </>
            ));
            expect(
                screen.getByRole('combobox', { name: 'Language Русский' })
            ).toBeTruthy();
            await expectNoA11yViolations();
        });

        it('is the label alone while nothing is selected', () => {
            const { button } = renderCombobox(undefined);
            expect(button.getAttribute('aria-label')).toBe('Fruit');
            expect(button.textContent).toContain('Pick one');
        });
    });

    describe('keys while closed', () => {
        it.each(['Enter', ' ', 'ArrowDown', 'ArrowUp'])(
            '%j opens on the selected option',
            (k) => {
                const { button, onChange } = renderCombobox('blueberry');
                key(button, k);
                expect(listbox()).not.toBeNull();
                expect(active(button)).toBe('Blueberry');
                expect(onChange).not.toHaveBeenCalled();
            }
        );

        it('opens on the first enabled option when none is selected', () => {
            const { button } = renderCombobox(undefined, [
                { value: 'x', label: 'X', disabled: true },
                ...fruits,
            ]);
            key(button, 'ArrowDown');
            expect(active(button)).toBe('Apple');
        });

        it('Alt+Down opens without a move; Alt+Up does not open', () => {
            const { button } = renderCombobox('banana');
            key(button, 'ArrowUp', { altKey: true });
            expect(listbox()).toBeNull();
            key(button, 'ArrowDown', { altKey: true });
            expect(listbox()).not.toBeNull();
            expect(active(button)).toBe('Banana');
        });

        it('Home and End open on the first and the last option', () => {
            const { button } = renderCombobox('banana');
            key(button, 'End');
            expect(active(button)).toBe('Cherry');
            key(button, 'Escape');
            key(button, 'Home');
            expect(active(button)).toBe('Apple');
        });

        it('PageDown, PageUp and Escape do nothing', () => {
            const { button } = renderCombobox('banana');
            for (const k of ['PageDown', 'PageUp', 'Escape']) key(button, k);
            expect(listbox()).toBeNull();
        });

        it('a letter opens and goes to the match', () => {
            const { button, onChange } = renderCombobox('apple');
            key(button, 'c');
            expect(listbox()).not.toBeNull();
            expect(active(button)).toBe('Cherry');
            expect(onChange).not.toHaveBeenCalled();
        });

        it('leaves Tab to the browser', () => {
            const { button } = renderCombobox('apple');
            const tab = new KeyboardEvent('keydown', {
                key: 'Tab',
                bubbles: true,
                cancelable: true,
            });
            button.dispatchEvent(tab);
            expect(tab.defaultPrevented).toBe(false);
            expect(listbox()).toBeNull();
        });
    });

    describe('keys while open', () => {
        it('arrows move, skip disabled, do not wrap; nothing is chosen', () => {
            const { button, onChange } = renderCombobox('apple');
            key(button, 'Enter');
            key(button, 'ArrowUp');
            expect(active(button)).toBe('Apple');
            key(button, 'ArrowDown');
            key(button, 'ArrowDown');
            expect(active(button)).toBe('Blueberry');
            key(button, 'End');
            key(button, 'ArrowDown');
            expect(active(button)).toBe('Cherry');
            key(button, 'Home');
            expect(active(button)).toBe('Apple');
            expect(onChange).not.toHaveBeenCalled();
            expect(listbox()).not.toBeNull();
        });

        it('pages by ten', () => {
            const many = Array.from({ length: 30 }, (_, i) => ({
                value: `${i}`,
                label: `Item ${i}`,
            }));
            const { button } = renderCombobox('0', many);
            key(button, 'Enter');
            key(button, 'PageDown');
            expect(active(button)).toBe('Item 10');
            key(button, 'PageDown');
            key(button, 'PageDown');
            expect(active(button)).toBe('Item 29');
            key(button, 'PageUp');
            expect(active(button)).toBe('Item 19');
        });

        it.each(['Enter', ' '])('%j chooses the active option', (k) => {
            const { button, value, onChange } = renderCombobox('apple');
            key(button, 'Enter');
            key(button, 'ArrowDown');
            key(button, k);
            expect(value()).toBe('banana');
            expect(onChange).toHaveBeenCalledTimes(1);
            expect(listbox()).toBeNull();
            expect(document.activeElement).toBe(button);
        });

        it('Alt+Up chooses; Alt+Down keeps it open', () => {
            const { button, value } = renderCombobox('apple');
            key(button, 'Enter');
            key(button, 'ArrowDown');
            key(button, 'ArrowDown', { altKey: true });
            expect(listbox()).not.toBeNull();
            expect(active(button)).toBe('Banana');
            key(button, 'ArrowUp', { altKey: true });
            expect(value()).toBe('banana');
            expect(listbox()).toBeNull();
        });

        it('Escape closes without a choice', () => {
            const { button, value, onChange } = renderCombobox('apple');
            key(button, 'Enter');
            key(button, 'End');
            key(button, 'Escape');
            expect(listbox()).toBeNull();
            expect(value()).toBe('apple');
            expect(onChange).not.toHaveBeenCalled();
            expect(document.activeElement).toBe(button);
        });

        it('Tab chooses, closes, and lets the focus move on', () => {
            const { button, value } = renderCombobox('apple');
            key(button, 'Enter');
            key(button, 'End');
            const tab = new KeyboardEvent('keydown', {
                key: 'Tab',
                bubbles: true,
                cancelable: true,
            });
            button.dispatchEvent(tab);
            expect(tab.defaultPrevented).toBe(false);
            expect(value()).toBe('cherry');
            expect(listbox()).toBeNull();
        });

        it('does not call onChange for the selected value', () => {
            const { button, onChange } = renderCombobox('banana');
            key(button, 'Enter');
            key(button, 'Enter');
            expect(listbox()).toBeNull();
            fireEvent.click(button);
            fireEvent.click(option('Banana'));
            expect(onChange).not.toHaveBeenCalled();
        });

        describe('type-ahead', () => {
            beforeEach(() => vi.useFakeTimers());
            afterEach(() => vi.useRealTimers());

            it('goes to a match, a letter again goes on, skips disabled', () => {
                const { button, onChange } = renderCombobox('apple');
                key(button, 'Enter');
                key(button, 'b');
                expect(active(button)).toBe('Banana');
                key(button, 'b');
                expect(active(button)).toBe('Blueberry');
                vi.advanceTimersByTime(TYPE_AHEAD_MS);
                key(button, 'c');
                key(button, 'h');
                expect(active(button)).toBe('Cherry');
                expect(onChange).not.toHaveBeenCalled();
            });

            it('takes a Space inside a search as a letter', () => {
                const { button, onChange } = renderCombobox(undefined, [
                    { value: 'a', label: 'New York' },
                    { value: 'b', label: 'Newark' },
                    { value: 'c', label: 'New Zealand' },
                ]);
                key(button, 'Enter');
                key(button, 'End');
                for (const c of 'new z') key(button, c);
                expect(listbox()).not.toBeNull();
                expect(active(button)).toBe('New Zealand');
                expect(onChange).not.toHaveBeenCalled();
            });
        });
    });

    it('ignores keys with Ctrl or Meta', () => {
        const { button } = renderCombobox('apple');
        key(button, 'ArrowDown', { ctrlKey: true });
        key(button, 'a', { metaKey: true });
        expect(listbox()).toBeNull();
    });

    it('keeps its keys to its own elements', () => {
        renderCombobox('apple');
        key(document.body, 'ArrowDown');
        key(document.body, 'c');
        expect(listbox()).toBeNull();
    });

    describe('mouse', () => {
        it('a click on the button opens and closes the list', () => {
            const { button } = renderCombobox('apple');
            fireEvent.click(button);
            expect(listbox()).not.toBeNull();
            fireEvent.click(button);
            expect(listbox()).toBeNull();
        });

        it('a click on an option chooses it and closes', () => {
            const { button, value } = renderCombobox('apple');
            fireEvent.click(button);
            const press = fireEvent.mouseDown(option('Cherry'));
            // The focus stays on the button.
            expect(press).toBe(false);
            fireEvent.click(option('Cherry'));
            expect(value()).toBe('cherry');
            expect(listbox()).toBeNull();
            expect(document.activeElement).toBe(button);
        });

        it('a click on a disabled option does nothing', () => {
            const { button, onChange } = renderCombobox('apple');
            fireEvent.click(button);
            fireEvent.click(option('Blackberry'));
            expect(onChange).not.toHaveBeenCalled();
            expect(listbox()).not.toBeNull();
        });

        it('hover makes an enabled option active', () => {
            const { button } = renderCombobox('apple');
            fireEvent.click(button);
            fireEvent.mouseEnter(option('Blueberry'));
            expect(active(button)).toBe('Blueberry');
            fireEvent.mouseEnter(option('Blackberry'));
            expect(active(button)).toBe('Blueberry');
        });

        it('a click outside closes without a choice', () => {
            const { button, onChange } = renderCombobox('apple');
            fireEvent.click(button);
            fireEvent.click(document.body);
            expect(listbox()).toBeNull();
            expect(onChange).not.toHaveBeenCalled();
        });
    });

    it('closes when the focus leaves it', () => {
        const { button, onChange } = renderCombobox('apple');
        fireEvent.click(button);
        const other = screen.getByRole('button', { name: 'Elsewhere' });
        fireEvent.focusOut(button, { relatedTarget: other });
        expect(listbox()).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('scrolls the active option into view', () => {
        const scroll = vi.fn();
        Element.prototype.scrollIntoView = scroll;
        try {
            const { button } = renderCombobox('apple');
            key(button, 'Enter');
            expect(scroll.mock.contexts.at(-1)).toBe(option('Apple'));
            key(button, 'End');
            expect(scroll).toHaveBeenLastCalledWith({ block: 'nearest' });
            expect(scroll.mock.contexts.at(-1)).toBe(option('Cherry'));
        } finally {
            // jsdom has none.
            Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
        }
    });

    describe('placement', () => {
        let buttonBottom = 100;
        const rect = (top: number, height: number) =>
            ({ top, bottom: top + height, height }) as DOMRect;

        beforeEach(() => {
            vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
            vi.spyOn(
                HTMLElement.prototype,
                'getBoundingClientRect'
            ).mockImplementation(function (this: HTMLElement) {
                return this.getAttribute('role') === 'listbox'
                    ? rect(0, 300)
                    : rect(buttonBottom - 32, 32);
            });
        });
        afterEach(() => vi.restoreAllMocks());

        const root = (button: HTMLElement) =>
            button.closest('.combobox') as HTMLElement;

        it('opens below when the list fits there', () => {
            buttonBottom = 100;
            const { button } = renderCombobox('apple');
            fireEvent.click(button);
            expect(root(button).dataset.dropUp).toBe('false');
        });

        it('opens above when it does not fit below, again on scroll', () => {
            buttonBottom = 700;
            const { button } = renderCombobox('apple');
            fireEvent.click(button);
            expect(root(button).dataset.dropUp).toBe('true');

            buttonBottom = 200;
            fireEvent.scroll(window);
            expect(root(button).dataset.dropUp).toBe('false');

            buttonBottom = 750;
            fireEvent(window, new Event('resize'));
            expect(root(button).dataset.dropUp).toBe('true');

            fireEvent.click(button);
            expect(root(button).dataset.dropUp).toBe('false');
        });
    });
});
