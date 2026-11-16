// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { expectNoA11yViolations } from '@shared/testing/axe';
import { TYPE_AHEAD_MS, type ListOption } from '@shared/ui/Listbox';
import Combobox, { MAX_RESULTS } from './Combobox';

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
        it('shows the short label and names both', async () => {
            render(() => (
                <Combobox
                    label="Language"
                    options={languages}
                    value="ro"
                    onChange={() => {}}
                />
            ));
            const button = screen.getByRole('combobox', {
                name: 'Language: Română (RO)',
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

        it('adds both labels to a visible label', async () => {
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
                screen.getByRole('combobox', { name: 'Language Русский (RU)' })
            ).toBeTruthy();
            await expectNoA11yViolations();
        });

        it('has no brackets without a short label', () => {
            const { button } = renderCombobox('banana');
            expect(button.getAttribute('aria-label')).toBe('Fruit: Banana');
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

    describe('the outline of the active option', () => {
        const keys = (name: string) =>
            option(name).classList.contains('combobox-option--keys');
        const anyKeys = () =>
            document.querySelector('.combobox-option--keys') !== null;

        it('shows when a key opens the list and moves in it', () => {
            const { button } = renderCombobox('apple');
            key(button, 'Enter');
            expect(keys('Apple')).toBe(true);
            key(button, 'ArrowDown');
            expect(keys('Banana')).toBe(true);
            expect(keys('Apple')).toBe(false);
        });

        it('does not show for a click or hover; an arrow brings it back', () => {
            const { button } = renderCombobox('apple');
            fireEvent.click(button);
            expect(active(button)).toBe('Apple');
            expect(anyKeys()).toBe(false);
            fireEvent.mouseEnter(option('Blueberry'));
            expect(active(button)).toBe('Blueberry');
            expect(
                option('Blueberry').classList.contains(
                    'combobox-option--active'
                )
            ).toBe(true);
            expect(anyKeys()).toBe(false);
            key(button, 'ArrowDown');
            expect(keys('Cherry')).toBe(true);
        });
    });

    it('opens on the selected option when clicked', () => {
        const scroll = vi.fn();
        Element.prototype.scrollIntoView = scroll;
        try {
            const { button } = renderCombobox('cherry');
            fireEvent.click(button);
            expect(scroll.mock.contexts.at(-1)).toBe(option('Cherry'));
        } finally {
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

describe('Combobox, hint placement', () => {
    it('puts a short hint at the end of the line when asked', async () => {
        render(() => (
            <Combobox
                options={[{ value: 'en', label: 'English', hint: 'EN' }]}
                value="en"
                onChange={() => {}}
                label="Language"
                hintPlacement="end"
            />
        ));
        fireEvent.click(screen.getByRole('combobox'));
        const list = screen.getByRole('listbox');
        expect(list.classList.contains('combobox-list--hint-end')).toBe(true);
        expect(
            screen.getByRole('option', { name: 'English' }).textContent
        ).toContain('EN');
        await expectNoA11yViolations();
    });

    it('keeps the hint under the label by default', () => {
        render(() => (
            <Combobox
                options={[{ value: 'en', label: 'English', hint: 'EN' }]}
                value="en"
                onChange={() => {}}
                label="Language"
            />
        ));
        fireEvent.click(screen.getByRole('combobox'));
        expect(
            screen
                .getByRole('listbox')
                .classList.contains('combobox-list--hint-end')
        ).toBe(false);
    });
});

describe('Combobox, top layer', () => {
    // jsdom has no Popover API: these tests give it one.
    const proto = HTMLElement.prototype as unknown as {
        showPopover?: () => void;
        hidePopover?: () => void;
    };
    let show = vi.fn<() => void>();
    let hide = vi.fn<() => void>();
    // The anchor's box; the list is 300 px high.
    let anchorTop = 68;

    beforeEach(() => {
        show = vi.fn<() => void>();
        hide = vi.fn<() => void>();
        proto.showPopover = show;
        proto.hidePopover = hide;
        anchorTop = 68;
        vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
        vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000);
        vi.spyOn(
            HTMLElement.prototype,
            'getBoundingClientRect'
        ).mockImplementation(function (this: HTMLElement) {
            if (this.classList.contains('combobox-popup'))
                return { top: 0, bottom: 300, height: 300 } as DOMRect;
            return {
                top: anchorTop,
                bottom: anchorTop + 32,
                height: 32,
                left: 600,
                right: 720,
                width: 120,
            } as DOMRect;
        });
    });
    afterEach(() => {
        delete proto.showPopover;
        delete proto.hidePopover;
        vi.restoreAllMocks();
    });

    // jsdom hides a [popover] that the stub did not really show.
    const shownList = () => screen.getByRole('listbox', { hidden: true });

    function renderAligned(align?: 'start' | 'end') {
        render(() => (
            <Combobox
                label="Fruit"
                options={fruits}
                value="apple"
                onChange={() => {}}
                align={align}
            />
        ));
        return screen.getByRole('combobox');
    }

    it('shows the list in the top layer while open', async () => {
        const button = renderAligned();
        fireEvent.click(button);
        const list = shownList();
        expect(list.getAttribute('popover')).toBe('manual');
        expect(show).toHaveBeenCalledTimes(1);
        expect(show.mock.contexts[0]).toBe(list);
        // It stays in its place: the root holds it, and the button
        // points at it.
        expect(button.closest('.combobox')?.contains(list)).toBe(true);
        expect(button.getAttribute('aria-controls')).toBe(list.id);
        await expectNoA11yViolations();

        fireEvent.keyDown(button, { key: 'Escape' });
        expect(hide).toHaveBeenCalledTimes(1);
        expect(hide.mock.contexts[0]).toBe(list);
        expect(screen.queryByRole('listbox', { hidden: true })).toBeNull();
    });

    it('puts the list under the anchor at its start edge', () => {
        const button = renderAligned();
        fireEvent.click(button);
        const style = shownList().style;
        expect(style.position).toBe('fixed');
        expect(style.top).toBe('104px');
        expect(style.bottom).toBe('auto');
        expect(style.left).toBe('600px');
        expect(style.right).toBe('auto');
        expect(style.getPropertyValue('--popover-anchor-width')).toBe('120px');
    });

    it('lines up the right edges with align="end"', () => {
        const button = renderAligned('end');
        expect(button.closest('.combobox')?.getAttribute('data-align')).toBe(
            'end'
        );
        fireEvent.click(button);
        const style = shownList().style;
        expect(style.left).toBe('auto');
        expect(style.right).toBe('280px');
    });

    it('opens above when it does not fit below, and follows on scroll', () => {
        anchorTop = 700;
        const button = renderAligned();
        fireEvent.click(button);
        const style = shownList().style;
        expect(button.closest('.combobox')?.getAttribute('data-drop-up')).toBe(
            'true'
        );
        expect(style.top).toBe('auto');
        expect(style.bottom).toBe('104px');

        anchorTop = 200;
        fireEvent.scroll(window);
        expect(style.top).toBe('236px');
        expect(style.bottom).toBe('auto');
    });

    it('shows the editable popup in the top layer', () => {
        render(() => (
            <Combobox
                editable
                label="Fruit"
                options={fruits}
                value={undefined}
                onChange={() => {}}
            />
        ));
        const input = screen.getByRole('combobox');
        fireEvent.click(input);
        const popup = document.querySelector('div.combobox-popup');
        expect(popup?.getAttribute('popover')).toBe('manual');
        expect(show.mock.contexts[0]).toBe(popup);
        expect((popup as HTMLElement).style.left).toBe('600px');

        fireEvent.keyDown(input, { key: 'Escape' });
        expect(hide.mock.contexts[0]).toBe(popup);
    });

    it('keeps the stylesheet placement without the API', () => {
        delete proto.showPopover;
        delete proto.hidePopover;
        const button = renderAligned('end');
        expect(() => fireEvent.click(button)).not.toThrow();
        const list = shownList();
        expect(list.style.position).toBe('');
        expect(list.style.left).toBe('');
        expect(() =>
            fireEvent.keyDown(button, { key: 'Escape' })
        ).not.toThrow();
        expect(listbox()).toBeNull();
    });
});

describe('Combobox, editable', () => {
    const resultsText = (n: number) => `${n} results`;

    function renderEditable(
        initial?: string,
        extra: {
            allowCustom?: boolean;
            maxResults?: number;
            options?: ListOption<string>[];
        } = {}
    ) {
        const [value, setValue] = createSignal<string | undefined>(initial);
        const onChange = vi.fn((v: string) => setValue(v));
        render(() => (
            <>
                <Combobox
                    editable
                    label="Fruit"
                    options={extra.options ?? fruits}
                    value={value()}
                    onChange={onChange}
                    allowCustom={extra.allowCustom}
                    maxResults={extra.maxResults}
                    resultsText={resultsText}
                    noResults="Nothing found"
                    moreResults="Type more to narrow the list"
                />
                <button type="button">Elsewhere</button>
            </>
        ));
        const input = screen.getByRole<HTMLInputElement>('combobox');
        input.focus();
        return { value, onChange, input };
    }

    const type = (input: HTMLInputElement, text: string) => {
        input.value = text;
        fireEvent.input(input);
    };
    const shownLabels = () =>
        screen
            .queryAllByRole('option')
            .map((o) => o.querySelector('.combobox-label')?.textContent);
    const status = () => screen.getByRole('status');
    const tab = (el: HTMLElement) => {
        const e = new KeyboardEvent('keydown', {
            key: 'Tab',
            bubbles: true,
            cancelable: true,
        });
        el.dispatchEvent(e);
        return e;
    };
    const leave = (input: HTMLElement) =>
        fireEvent.focusOut(input, {
            relatedTarget: screen.getByRole('button', { name: 'Elsewhere' }),
        });

    it('marks up a closed input with a live region', async () => {
        const { input } = renderEditable('banana');
        expect(input.tagName).toBe('INPUT');
        expect(input.getAttribute('aria-autocomplete')).toBe('list');
        expect(input.getAttribute('aria-expanded')).toBe('false');
        expect(input.getAttribute('autocomplete')).toBe('off');
        expect(input.hasAttribute('aria-controls')).toBe(false);
        expect(input.value).toBe('Banana');
        expect(screen.getByRole('combobox', { name: 'Fruit' })).toBe(input);
        // The live region is there before anything is typed.
        expect(status().textContent).toBe('');
        expect(listbox()).toBeNull();
        await expectNoA11yViolations();
    });

    it('filters the options by label and hint as the user types', async () => {
        const { input, onChange } = renderEditable();
        const region = status();
        type(input, 'bl');
        expect(shownLabels()).toEqual(['Blackberry', 'Blueberry']);
        expect(input.getAttribute('aria-expanded')).toBe('true');
        expect(input.getAttribute('aria-controls')).toBe(listbox()?.id);
        // No option is active until the user picks one.
        expect(input.hasAttribute('aria-activedescendant')).toBe(false);
        // The same region, with new text.
        expect(status()).toBe(region);
        expect(region.textContent).toBe('2 results');

        type(input, 'green');
        expect(shownLabels()).toEqual(['Apple']);
        expect(region.textContent).toBe('1 results');

        type(input, '  ');
        expect(shownLabels()).toHaveLength(fruits.length);
        expect(onChange).not.toHaveBeenCalled();
        await expectNoA11yViolations();
    });

    it('says when nothing matches, in the list and the live region', async () => {
        const { input } = renderEditable();
        type(input, 'xyzzy');
        expect(listbox()).toBeNull();
        expect(input.getAttribute('aria-expanded')).toBe('false');
        expect(input.hasAttribute('aria-controls')).toBe(false);
        expect(status().textContent).toBe('Nothing found');
        expect(document.querySelector('.combobox-note')?.textContent).toBe(
            'Nothing found'
        );
        await expectNoA11yViolations();
    });

    it('shows at most maxResults matches and asks for more letters', () => {
        const many = Array.from({ length: 150 }, (_, i) => ({
            value: `${i}`,
            label: `Item ${i}`,
        }));
        const { input } = renderEditable(undefined, { options: many });
        type(input, 'item');
        expect(shownLabels()).toHaveLength(MAX_RESULTS);
        expect(status().textContent).toBe(
            '150 results Type more to narrow the list'
        );
        expect(screen.getByText('Type more to narrow the list')).toBeTruthy();

        type(input, 'item 149');
        expect(shownLabels()[0]).toBe('Item 149');
        expect(shownLabels().length).toBeLessThan(MAX_RESULTS);
        expect(screen.queryByText('Type more to narrow the list')).toBeNull();
    });

    it('takes maxResults from the caller; the full list has no cap', () => {
        const { input } = renderEditable(undefined, { maxResults: 2 });
        type(input, 'b');
        expect(shownLabels()).toHaveLength(2);
        key(input, 'Escape');
        key(input, 'Escape');
        key(input, 'ArrowDown', { altKey: true });
        expect(shownLabels()).toHaveLength(fruits.length);
    });

    it('arrows open and move; Enter chooses and closes', async () => {
        const { input, value, onChange } = renderEditable('apple');
        key(input, 'ArrowDown');
        expect(listbox()).not.toBeNull();
        // The full list, on the selected option.
        expect(shownLabels()).toHaveLength(fruits.length);
        expect(active(input)).toBe('Apple');
        await expectNoA11yViolations();
        key(input, 'ArrowDown');
        key(input, 'ArrowDown');
        expect(active(input)).toBe('Blueberry');
        key(input, 'ArrowUp');
        expect(active(input)).toBe('Banana');
        expect(document.activeElement).toBe(input);
        key(input, 'Enter');
        expect(value()).toBe('banana');
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(listbox()).toBeNull();
        expect(input.value).toBe('Banana');
        expect(document.activeElement).toBe(input);
    });

    it('down opens on the first option, up on the last, when none is selected', () => {
        const { input } = renderEditable();
        key(input, 'ArrowUp');
        expect(active(input)).toBe('Cherry');
        key(input, 'Escape');
        key(input, 'ArrowDown');
        expect(active(input)).toBe('Apple');
    });

    it('arrows go through the matches of the text', () => {
        const { input, value } = renderEditable();
        type(input, 'berry');
        key(input, 'ArrowDown');
        // Blackberry is disabled.
        expect(active(input)).toBe('Blueberry');
        key(input, 'Enter');
        expect(value()).toBe('blueberry');
    });

    it('Alt+Down opens with no active option; Alt+Up closes', () => {
        const { input } = renderEditable('banana');
        key(input, 'ArrowUp', { altKey: true });
        expect(listbox()).toBeNull();
        key(input, 'ArrowDown', { altKey: true });
        expect(listbox()).not.toBeNull();
        expect(input.hasAttribute('aria-activedescendant')).toBe(false);
        key(input, 'ArrowUp', { altKey: true });
        expect(listbox()).toBeNull();
        expect(input.value).toBe('Banana');
    });

    it('Home and End stay with the text', () => {
        const { input } = renderEditable('banana');
        key(input, 'ArrowDown');
        for (const k of ['Home', 'End']) {
            const e = new KeyboardEvent('keydown', {
                key: k,
                bubbles: true,
                cancelable: true,
            });
            input.dispatchEvent(e);
            expect(e.defaultPrevented).toBe(false);
            expect(active(input)).toBe('Banana');
        }
    });

    it('letters and Space go into the text, not to type-ahead', () => {
        const { input } = renderEditable('apple');
        key(input, 'ArrowDown');
        const e = new KeyboardEvent('keydown', {
            key: 'c',
            bubbles: true,
            cancelable: true,
        });
        input.dispatchEvent(e);
        expect(e.defaultPrevented).toBe(false);
        expect(active(input)).toBe('Apple');
    });

    it('Escape closes and keeps the text; a second Escape clears it', () => {
        const { input, onChange } = renderEditable('apple');
        type(input, 'ban');
        key(input, 'Escape');
        expect(listbox()).toBeNull();
        expect(input.value).toBe('ban');
        key(input, 'Escape');
        expect(input.value).toBe('');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('Enter on no option commits the text', () => {
        const { input, value } = renderEditable('apple');
        type(input, ' cherry ');
        const e = fireEvent.keyDown(input, { key: 'Enter' });
        expect(e).toBe(false);
        expect(value()).toBe('cherry');
        expect(input.value).toBe('Cherry');
        expect(listbox()).toBeNull();
    });

    describe('Tab', () => {
        it('chooses an option that the arrows made active', () => {
            const { input, value } = renderEditable('apple');
            type(input, 'b');
            key(input, 'ArrowDown');
            const e = tab(input);
            expect(e.defaultPrevented).toBe(false);
            expect(value()).toBe('banana');
            expect(listbox()).toBeNull();
        });

        it('does not choose an option under the mouse', () => {
            const { input, value, onChange } = renderEditable('apple');
            type(input, 'b');
            fireEvent.mouseEnter(option('Banana'));
            expect(active(input)).toBe('Banana');
            tab(input);
            expect(onChange).not.toHaveBeenCalled();
            expect(value()).toBe('apple');
            expect(input.value).toBe('Apple');
            expect(listbox()).toBeNull();
        });

        it('does not choose after the text changed', () => {
            const { input, onChange } = renderEditable('apple');
            key(input, 'ArrowDown');
            key(input, 'ArrowDown');
            type(input, 'ch');
            tab(input);
            expect(onChange).not.toHaveBeenCalled();
            expect(input.value).toBe('Apple');
        });
    });

    describe('leaving the input', () => {
        it('without allowCustom, an unknown text goes back to the selected label', () => {
            const { input, onChange } = renderEditable('apple');
            type(input, 'durian');
            leave(input);
            expect(listbox()).toBeNull();
            expect(input.value).toBe('Apple');
            expect(onChange).not.toHaveBeenCalled();
        });

        it('a label picks its option, whatever its case', () => {
            const { input, value } = renderEditable('apple');
            type(input, 'BANANA');
            leave(input);
            expect(value()).toBe('banana');
            expect(input.value).toBe('Banana');
        });

        it('a disabled label does not pick its option', () => {
            const { input, onChange } = renderEditable('apple');
            type(input, 'Blackberry');
            leave(input);
            expect(onChange).not.toHaveBeenCalled();
            expect(input.value).toBe('Apple');
        });

        it('with allowCustom, the text is the value', () => {
            const { input, value, onChange } = renderEditable('apple', {
                allowCustom: true,
            });
            type(input, 'durian');
            leave(input);
            expect(value()).toBe('durian');
            expect(input.value).toBe('durian');
            // A text that is a label still gives the option's value.
            type(input, 'cherry');
            tab(input);
            expect(value()).toBe('cherry');
            expect(onChange).toHaveBeenCalledTimes(2);
        });

        it('with allowCustom, the same text calls nothing', () => {
            const { input, onChange } = renderEditable('durian', {
                allowCustom: true,
            });
            expect(input.value).toBe('durian');
            type(input, 'durian');
            leave(input);
            expect(onChange).not.toHaveBeenCalled();
        });
    });

    it('does not call onChange for the selected value', () => {
        const { input, onChange } = renderEditable('banana');
        key(input, 'ArrowDown');
        key(input, 'Enter');
        type(input, 'banana');
        tab(input);
        type(input, 'ban');
        fireEvent.click(option('Banana'));
        expect(onChange).not.toHaveBeenCalled();
        expect(input.value).toBe('Banana');
    });

    describe('mouse', () => {
        it('a click on the input opens the full list', () => {
            const { input } = renderEditable('banana');
            fireEvent.click(input);
            expect(shownLabels()).toHaveLength(fruits.length);
            expect(input.hasAttribute('aria-activedescendant')).toBe(false);
        });

        it('hover makes active; a click chooses; the focus stays', () => {
            const { input, value } = renderEditable('apple');
            type(input, 'e');
            fireEvent.mouseEnter(option('Cherry'));
            expect(active(input)).toBe('Cherry');
            fireEvent.mouseEnter(option('Blackberry'));
            expect(active(input)).toBe('Cherry');
            const press = fireEvent.mouseDown(option('Cherry'));
            expect(press).toBe(false);
            fireEvent.click(option('Cherry'));
            expect(value()).toBe('cherry');
            expect(input.value).toBe('Cherry');
            expect(listbox()).toBeNull();
            expect(document.activeElement).toBe(input);
        });

        it('hover and a click give no outline; an arrow does', () => {
            const { input } = renderEditable('apple');
            fireEvent.click(input);
            fireEvent.mouseEnter(option('Banana'));
            expect(active(input)).toBe('Banana');
            expect(document.querySelector('.combobox-option--keys')).toBeNull();
            key(input, 'ArrowDown');
            expect(
                option('Blueberry').classList.contains('combobox-option--keys')
            ).toBe(true);
        });

        it('a click opens on the selected option, which is not active', () => {
            const scroll = vi.fn();
            Element.prototype.scrollIntoView = scroll;
            try {
                const { input } = renderEditable('cherry');
                fireEvent.click(input);
                expect(input.hasAttribute('aria-activedescendant')).toBe(false);
                expect(scroll).toHaveBeenLastCalledWith({ block: 'nearest' });
                expect(scroll.mock.contexts.at(-1)).toBe(option('Cherry'));
                // An emptied query shows all options and the selected one.
                type(input, 'b');
                scroll.mockClear();
                type(input, '');
                expect(scroll.mock.contexts.at(-1)).toBe(option('Cherry'));
            } finally {
                Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
            }
        });

        it('a click outside closes', () => {
            const { input, onChange } = renderEditable('apple');
            type(input, 'b');
            fireEvent.click(document.body);
            expect(listbox()).toBeNull();
            expect(onChange).not.toHaveBeenCalled();
        });
    });

    it('takes allowCustom only for string values', () => {
        const numbers: ListOption<number>[] = [{ value: 1, label: 'One' }];
        render(() => (
            <Combobox
                editable
                label="Number"
                options={numbers}
                value={1}
                onChange={() => {}}
                // @ts-expect-error: a typed text is no number.
                allowCustom
            />
        ));
        expect(screen.getByRole('combobox')).toBeTruthy();
    });

    describe('onClear', () => {
        function renderClearable(initial?: string) {
            const [value, setValue] = createSignal<string | undefined>(initial);
            const onClear = vi.fn(() => setValue(undefined));
            const onChange = vi.fn((v: string) => setValue(v));
            render(() => (
                <>
                    <Combobox
                        editable
                        label="Fruit"
                        options={fruits}
                        value={value()}
                        onChange={onChange}
                        onClear={onClear}
                    />
                    <button type="button">Elsewhere</button>
                </>
            ));
            const input = screen.getByRole<HTMLInputElement>('combobox');
            input.focus();
            return { value, onClear, onChange, input };
        }

        it('an empty input clears the value when the user leaves it', () => {
            const { input, value, onClear, onChange } =
                renderClearable('apple');
            type(input, '  ');
            leave(input);
            expect(onClear).toHaveBeenCalledTimes(1);
            expect(onChange).not.toHaveBeenCalled();
            expect(value()).toBeUndefined();
            expect(input.value).toBe('');
        });

        it('two Escapes and Tab clear it as well', () => {
            const { input, value } = renderClearable('apple');
            key(input, 'Escape');
            expect(input.value).toBe('');
            tab(input);
            expect(value()).toBeUndefined();
        });

        it('calls nothing while nothing is selected', () => {
            const { input, onClear } = renderClearable();
            type(input, '');
            leave(input);
            expect(onClear).not.toHaveBeenCalled();
        });
    });

    it('shows a new value from the caller', () => {
        const [value, setValue] = createSignal<string | undefined>('apple');
        render(() => (
            <Combobox
                editable
                label="Fruit"
                options={fruits}
                value={value()}
                onChange={setValue}
            />
        ));
        const input = screen.getByRole<HTMLInputElement>('combobox');
        setValue('cherry');
        expect(input.value).toBe('Cherry');
    });
});

describe('Combobox, form props', () => {
    function renderInForm(editable: boolean, disabled = false) {
        render(() => (
            <>
                <label id="fruit-label" for="fruit">
                    Fruit
                </label>
                <Combobox
                    editable={editable}
                    id="fruit"
                    name="fruit"
                    labelledBy="fruit-label"
                    options={fruits}
                    value="apple"
                    onChange={() => {}}
                    invalid
                    describedBy="fruit-error"
                    disabled={disabled}
                />
                <ul id="fruit-error">
                    <li>Pick a ripe one.</li>
                </ul>
            </>
        ));
        return screen.getByRole('combobox');
    }

    it.each([false, true])(
        'gives the control an id, aria-invalid and aria-describedby (editable: %s)',
        async (editable) => {
            const control = renderInForm(editable);
            expect(control.id).toBe('fruit');
            expect(screen.getByLabelText(/^Fruit/)).toBe(control);
            expect(control.getAttribute('aria-invalid')).toBe('true');
            expect(control.getAttribute('aria-describedby')).toBe(
                'fruit-error'
            );
            expect(control.classList.contains('invalid')).toBe(true);
            await expectNoA11yViolations();
        }
    );

    it('names the input in its form', () => {
        const input = renderInForm(true);
        expect(input.getAttribute('name')).toBe('fruit');
        expect(input.getAttribute('spellcheck')).toBe('false');
    });

    it('has no aria-invalid while the value is fine', () => {
        render(() => (
            <Combobox
                editable
                label="Fruit"
                options={fruits}
                value="apple"
                onChange={() => {}}
            />
        ));
        const input = screen.getByRole('combobox');
        expect(input.hasAttribute('aria-invalid')).toBe(false);
        expect(input.hasAttribute('aria-describedby')).toBe(false);
        expect(input.classList.contains('invalid')).toBe(false);
    });

    it.each([false, true])(
        'a disabled control does not open (editable: %s)',
        async (editable) => {
            const control = renderInForm(editable, true);
            expect((control as HTMLInputElement).disabled).toBe(true);
            fireEvent.click(control);
            key(control, 'ArrowDown');
            expect(listbox()).toBeNull();
            await expectNoA11yViolations();
        }
    );

    it('closes its list when it becomes disabled', () => {
        const [disabled, setDisabled] = createSignal(false);
        render(() => (
            <Combobox
                label="Fruit"
                options={fruits}
                value="apple"
                onChange={() => {}}
                disabled={disabled()}
            />
        ));
        const button = screen.getByRole('combobox');
        fireEvent.click(button);
        expect(listbox()).not.toBeNull();
        setDisabled(true);
        expect(listbox()).toBeNull();
    });
});
