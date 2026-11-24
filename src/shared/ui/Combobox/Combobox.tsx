import {
    createEffect,
    createMemo,
    createSignal,
    For,
    on,
    Show,
} from 'solid-js';
import type { ErrorItem } from '@shared/api/types';
import { createDismiss } from '@shared/lib/dismiss';
import { matchOptions } from '@shared/lib/text-match';
import FieldError, { errorId } from '@shared/ui/forms/FieldError';
import { IconCheck, IconChevronDown } from '@shared/ui/icons';
import {
    createOptionList,
    indexOfValue,
    OptionHint,
    type ActiveBy,
    type ListOption,
} from '@shared/ui/Listbox';
import { createPopover, type PopoverAlign } from '@shared/ui/Popover';
import './combobox.scss';

/** How many matches of a typed query an editable Combobox shows at most. */
export const MAX_RESULTS = 100;

// T comes from the options only (NoInfer elsewhere), as in Listbox.
export type ComboboxProps<T> = {
    options: readonly ListOption<T>[];
    /** The selected value, or undefined for none. */
    value: NoInfer<T> | undefined;
    /** Runs when the user picks another value (not the selected one). */
    onChange: (value: NoInfer<T>) => void;
    /**
     * The control's accessible name, when no visible label names it. The
     * select-only button's name is then "label: full label of the selected
     * option", with its short label after it in brackets.
     */
    label?: string;
    /** The id of a visible element that names the control. */
    labelledBy?: string;
    /** Shown on the button (or in the input) while nothing is selected. */
    placeholder?: string;
    /** Added to the root element, so the caller can dress the control. */
    class?: string;
    /**
     * Where an option's hint shows: under its label (the default, for long
     * hints such as a time zone's place) or at the end of its line, quieter
     * (for a short one such as a language's code).
     */
    hintPlacement?: 'below' | 'end';
    /**
     * Which edge of the button or the input the list lines up with: the
     * start (the default) or the end, e.g. for a control at the end of a
     * bar.
     */
    align?: PopoverAlign;
    /** Select-only: shown on hover over the button. */
    title?: string;
    /** The id of the button or the input, so that a <label for> names it. */
    id?: string;
    /** The name of the input (editable) or the button in its form. */
    name?: string;
    /**
     * The server's errors about it, shown under it and wired as a Field's
     * (aria-invalid, aria-describedby).
     */
    errors?: ErrorItem[];
    /** The value is wrong (aria-invalid); the caller shows why. */
    invalid?: boolean;
    /** Ids of the elements that describe the control, e.g. its errors. */
    describedBy?: string;
    /** The control takes no input, and its list does not open. */
    disabled?: boolean;
    /**
     * An input that filters the options as the user types (WAI-ARIA's
     * editable combobox with list autocomplete), instead of a button.
     */
    editable?: boolean;
    /**
     * Editable only, and only for string values: the typed text is the
     * value when it is not an option's label. Without it, such a text goes
     * back to the selected option's label when the user leaves the input.
     */
    allowCustom?: [T] extends [string] ? boolean : never;
    /**
     * Editable only: at most this many matches of a typed query show
     * (default MAX_RESULTS). The full list, opened without a query, shows
     * all options.
     */
    maxResults?: number;
    /**
     * Editable only: the number of matches for the live region, e.g.
     * (n) => t('results', '{count} results', { count: n }).
     */
    resultsText?: (count: number) => string;
    /** Editable only: shown in the list and announced when nothing matches. */
    noResults?: string;
    /** Editable only: shown and announced when more matched than show. */
    moreResults?: string;
    /**
     * Editable only: runs when the user empties the input and leaves it
     * while a value is selected; the caller then clears the value. Without
     * it, an empty input goes back to the selected option's label.
     */
    onClear?: () => void;
};

/**
 * A combobox, as WAI-ARIA's patterns. The select-only one is a button that
 * shows the selected value (its `short` label, if it has one) and opens a
 * list of the options under it, or over it when there is no room below.
 * The editable one is an input whose text filters the list. The focus stays
 * on the button or the input; aria-activedescendant points at the active
 * option. Values compare with Object.is; onChange runs only for another
 * value. It has no text of its own: the caller gives the labels.
 */
export default function Combobox<T>(props: ComboboxProps<T>) {
    const [open, setOpen] = createSignal(false);
    // Editable: the text of the input, and whether it filters the list
    // (the user typed it) or only shows the selected option's label.
    const [text, setText] = createSignal('');
    const [filtering, setFiltering] = createSignal(false);
    // Editable: whether the arrow keys (not the mouse, not typing) made the
    // active option active. Only then does Tab choose it.
    let explicit = false;

    // The text that filters the list: blank shows all options.
    const query = () => (props.editable && filtering() ? text().trim() : '');
    const matched = createMemo(() =>
        query()
            ? matchOptions(props.options, query(), (o) =>
                  // An empty field is near any short query: leave it out.
                  [o.label, o.hint].flat().filter((f): f is string => !!f)
              )
            : props.options
    );
    const shown = createMemo(() => {
        const all = matched();
        if (!query()) return all;
        const max = props.maxResults ?? MAX_RESULTS;
        return all.length > max ? all.slice(0, max) : all;
    });
    const more = () => matched().length > shown().length;

    const list = createOptionList(shown);
    // The base of the errors' id, when the caller gives no id.
    const errorsFor = () => props.id ?? `${list.id}-control`;
    const hasErrors = () => !!props.errors?.length;
    const invalid = () => !!props.invalid || hasErrors();
    const describedBy = () =>
        [props.describedBy, hasErrors() ? errorId(errorsFor()) : undefined]
            .filter(Boolean)
            .join(' ') || undefined;
    let root: HTMLDivElement | undefined;
    let anchor: HTMLElement | undefined;
    let popup: HTMLElement | undefined;
    const valueId = `${list.id}-value`;

    const selected = () =>
        props.value === undefined
            ? undefined
            : props.options[indexOfValue(props.options, props.value)];
    // The selected option's place in the shown list, or -1.
    const selectedIndex = () =>
        props.value === undefined ? -1 : indexOfValue(shown(), props.value);
    const isSelected = (option: ListOption<T>) =>
        props.value !== undefined && Object.is(option.value, props.value);

    // The list element is there only while it has options (an empty
    // listbox is not valid); "no results" is a note beside it.
    const listShown = () => open() && shown().length > 0;

    // The list goes into the top layer, under (or over) the button or the
    // input. Manual: the keys and createDismiss close it, not the browser.
    // Without the Popover API, combobox.scss places it.
    const { up: dropUp } = createPopover({
        panel: () => popup,
        anchor: () => anchor,
        open,
        mode: () => 'manual',
        placement: () => ({ align: props.align ?? 'start' }),
        fallback: 'stylesheet',
    });
    createDismiss(() => root, open, close);
    // A disabled control keeps no list open.
    createEffect(() => {
        if (props.disabled) close();
    });

    // The active option stays in view (the list has a scroll of its own).
    createEffect(() => {
        if (open() && list.active() >= 0) list.scrollActiveIntoView();
    });
    // A list that opens (or shows all options again) with no active option,
    // e.g. after a click in the input, still shows the selected one.
    createEffect(
        on([open, query], ([isOpen, q]) => {
            if (isOpen && !q && list.active() < 0) {
                list.scrollIntoView(selectedIndex());
            }
        })
    );

    // Editable: the text the input shows while the user does not type.
    const restingText = () => {
        const option = selected();
        if (option) return option.label;
        const value = props.value;
        return props.allowCustom && typeof value === 'string' ? value : '';
    };
    createEffect(
        on(restingText, (t) => {
            setText(t);
            setFiltering(false);
        })
    );

    function close() {
        setOpen(false);
    }

    // Opens the list by the keys or the pointer; the active option is the
    // selected one, or the first enabled one, unless `index` says another.
    function openList(by: ActiveBy, index?: number) {
        const chosen = selectedIndex();
        list.setActive(
            index ?? (list.enabled(chosen) ? chosen : list.firstEnabled()),
            by
        );
        setOpen(true);
    }

    function pick(option: ListOption<T>) {
        if (!isSelected(option)) props.onChange(option.value);
        // The value may stay the same: the text goes back to its label.
        setText(option.label);
        setFiltering(false);
    }

    function choose(index: number) {
        const option = shown()[index];
        if (option && !option.disabled) pick(option);
        close();
    }

    // Editable: what the text in the input means when the user leaves it
    // or presses Enter on no option. An option's label (case and spaces
    // around it do not matter) picks that option; another text is the value
    // with allowCustom, and goes back to the selected label without it. An
    // empty text clears the value when the caller gives onClear.
    function commit() {
        const typed = text();
        const query = typed.trim().toLocaleLowerCase();
        const match = query
            ? props.options.find(
                  (o) => !o.disabled && o.label.toLocaleLowerCase() === query
              )
            : undefined;
        if (match) {
            pick(match);
            return;
        }
        if (!query && props.onClear) {
            if (props.value !== undefined) props.onClear();
            setText('');
        } else if (props.allowCustom) {
            // allowCustom is there only when T is string.
            if (!Object.is(typed, props.value)) {
                props.onChange(typed as NoInfer<T>);
            }
        } else {
            setText(restingText());
        }
        setFiltering(false);
    }

    function onKeyDownClosed(e: KeyboardEvent) {
        switch (e.key) {
            case 'Enter':
            case ' ':
                if (e.key === ' ' && list.typing()) break;
                e.preventDefault();
                openList('keys');
                return;
            case 'ArrowDown':
            case 'ArrowUp':
                e.preventDefault();
                // Alt+Down and Alt+Up open the list on the selected option
                // as well; Alt+Up does nothing while it is closed.
                if (e.altKey && e.key === 'ArrowUp') return;
                openList('keys');
                return;
            case 'Home':
                e.preventDefault();
                openList('keys', list.firstEnabled());
                return;
            case 'End':
                e.preventDefault();
                openList('keys', -1);
                list.move('End');
                return;
        }
        if (e.key.length === 1 && !e.altKey) {
            e.preventDefault();
            openList('keys');
            list.typeAhead(e.key);
        }
    }

    function onKeyDownOpen(e: KeyboardEvent) {
        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                close();
                return;
            case 'Enter':
                e.preventDefault();
                choose(list.active());
                return;
            case 'Tab':
                // The focus moves on as usual.
                choose(list.active());
                return;
            case ' ':
                if (list.typing()) break;
                e.preventDefault();
                choose(list.active());
                return;
            case 'ArrowUp':
                if (e.altKey) {
                    e.preventDefault();
                    choose(list.active());
                    return;
                }
                break;
            case 'ArrowDown':
                if (e.altKey) {
                    e.preventDefault();
                    return;
                }
                break;
        }
        if (e.altKey) return;
        if (list.move(e.key) !== undefined) {
            e.preventDefault();
            return;
        }
        if (e.key.length === 1) {
            e.preventDefault();
            list.typeAhead(e.key);
        }
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.ctrlKey || e.metaKey) return;
        if (open()) onKeyDownOpen(e);
        else onKeyDownClosed(e);
    }

    // The keys of the input. The letters, Space, Home and End belong to
    // the text (no type-ahead); the arrows move in the list.
    function onInputKeyDown(e: KeyboardEvent) {
        if (e.ctrlKey || e.metaKey) return;
        switch (e.key) {
            case 'ArrowDown':
            case 'ArrowUp':
                e.preventDefault();
                if (!open()) {
                    // Alt+Down opens with no active option; Alt+Up does
                    // nothing while closed.
                    if (e.altKey) {
                        if (e.key === 'ArrowDown') openList('keys', -1);
                        return;
                    }
                    explicit = true;
                    if (selectedIndex() >= 0) openList('keys');
                    else {
                        openList('keys', -1);
                        list.move(e.key);
                    }
                    return;
                }
                if (e.altKey) {
                    // Alt+Up closes; the text stays.
                    if (e.key === 'ArrowUp') close();
                    return;
                }
                explicit = true;
                list.move(e.key);
                return;
            case 'PageDown':
            case 'PageUp':
                if (!open()) return;
                e.preventDefault();
                explicit = true;
                list.move(e.key);
                return;
            case 'Enter':
                if (open() && list.active() >= 0) {
                    e.preventDefault();
                    choose(list.active());
                    return;
                }
                // Closed, Enter still submits the form (no preventDefault).
                if (open()) e.preventDefault();
                commit();
                close();
                return;
            case 'Escape':
                if (open()) {
                    e.preventDefault();
                    close();
                } else if (text() !== '') {
                    e.preventDefault();
                    setText('');
                    setFiltering(true);
                }
                return;
            case 'Tab':
                // Tab chooses the active option only if the arrow keys made
                // it active after the last change of the text: an option
                // under the mouse, or none, leaves the text to commit(). The
                // focus moves on as usual.
                if (open() && explicit && list.active() >= 0) {
                    choose(list.active());
                } else {
                    commit();
                    close();
                }
                return;
        }
    }

    function onInput(e: InputEvent & { currentTarget: HTMLInputElement }) {
        setText(e.currentTarget.value);
        setFiltering(true);
        list.setActive(-1, 'keys');
        explicit = false;
        setOpen(true);
    }

    // A button clicks on Enter (keydown) and on Space (keyup); the keys
    // above already did their work.
    function onKeyUp(e: KeyboardEvent) {
        if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
    }

    // The focus went somewhere outside (Tab, a click on another control).
    function onFocusOut(e: FocusEvent) {
        const next = e.relatedTarget;
        if (next instanceof Node && root?.contains(next)) return;
        if (props.editable && (open() || filtering())) commit();
        close();
    }

    function onOptionClick(index: number) {
        if (list.enabled(index)) choose(index);
    }

    function onOptionHover(index: number) {
        if (!list.enabled(index)) return;
        list.setActive(index, 'pointer');
        explicit = false;
    }

    // WCAG 2.5.3 (Label in Name): the name holds the visible text, so a
    // short label shows in brackets after the full one: "Language: Română
    // (RO)". A voice user can say what they see.
    const fullLabel = (option: ListOption<T>) =>
        option.short && option.short !== option.label
            ? `${option.label} (${option.short})`
            : option.label;
    const buttonLabel = () => {
        const option = selected();
        if (props.label === undefined) return undefined;
        return option ? `${props.label}: ${fullLabel(option)}` : props.label;
    };
    const buttonLabelledBy = () => {
        if (props.labelledBy === undefined) return undefined;
        return selected() ? `${props.labelledBy} ${valueId}` : props.labelledBy;
    };

    // Editable: what the live region says while the list is open.
    const status = () => {
        if (!open()) return '';
        const count = matched().length;
        if (count === 0) return props.noResults ?? '';
        const found = props.resultsText?.(count) ?? '';
        return more() && props.moreResults
            ? `${found} ${props.moreResults}`.trim()
            : found;
    };

    const options = () => (
        <ul
            ref={(el) => {
                if (!props.editable) popup = el;
            }}
            id={list.id}
            role="listbox"
            tabIndex={-1}
            class={
                props.editable
                    ? 'combobox-list'
                    : 'combobox-popup combobox-list'
            }
            classList={{
                'combobox-list--hint-end': props.hintPlacement === 'end',
            }}
            aria-label={props.label}
            aria-labelledby={props.labelledBy}
            // The focus stays on the button: a press on the list must not
            // take it (that would close the list).
            onMouseDown={(e) => e.preventDefault()}
        >
            <For each={shown()}>
                {(option, i) => (
                    <li
                        id={list.optionId(i())}
                        role="option"
                        class="combobox-option"
                        classList={{
                            'combobox-option--active': list.active() === i(),
                            'combobox-option--keys':
                                list.active() === i() && list.activeByKeys(),
                        }}
                        aria-selected={isSelected(option)}
                        aria-disabled={option.disabled ? true : undefined}
                        aria-labelledby={`${list.optionId(i())}-label`}
                        aria-describedby={
                            option.hint
                                ? `${list.optionId(i())}-hint`
                                : undefined
                        }
                        onMouseEnter={() => onOptionHover(i())}
                        onClick={() => onOptionClick(i())}
                    >
                        <IconCheck class="combobox-check" size={16} />
                        <span class="combobox-text">
                            <span
                                id={`${list.optionId(i())}-label`}
                                class="combobox-label"
                            >
                                {option.label}
                            </span>
                            <Show when={option.hint}>
                                <span
                                    id={`${list.optionId(i())}-hint`}
                                    class="combobox-hint"
                                >
                                    <OptionHint hint={option.hint} />
                                </span>
                            </Show>
                        </span>
                    </li>
                )}
            </For>
        </ul>
    );

    return (
        <>
            <div
                ref={root}
                class={props.class ? `combobox ${props.class}` : 'combobox'}
                classList={{ 'combobox--editable': !!props.editable }}
                data-open={open()}
                data-drop-up={dropUp()}
                data-align={props.align ?? 'start'}
                onFocusOut={onFocusOut}
            >
                <Show
                    when={props.editable}
                    fallback={
                        <>
                            <button
                                ref={(el) => (anchor = el)}
                                type="button"
                                role="combobox"
                                class="combobox-button"
                                aria-haspopup="listbox"
                                aria-expanded={open()}
                                aria-controls={open() ? list.id : undefined}
                                aria-activedescendant={
                                    open() ? list.activeId() : undefined
                                }
                                aria-label={buttonLabel()}
                                aria-labelledby={buttonLabelledBy()}
                                aria-invalid={invalid() ? true : undefined}
                                aria-describedby={describedBy()}
                                id={props.id}
                                name={props.name}
                                classList={{ invalid: invalid() }}
                                disabled={props.disabled}
                                title={props.title}
                                onClick={() =>
                                    open() ? close() : openList('pointer')
                                }
                                onKeyDown={onKeyDown}
                                onKeyUp={onKeyUp}
                            >
                                <span class="combobox-value">
                                    {selected()
                                        ? (selected()?.short ??
                                          selected()?.label)
                                        : props.placeholder}
                                </span>
                                {/* The full label, for the name given by labelledBy. */}
                                <Show
                                    when={
                                        props.labelledBy !== undefined &&
                                        selected()
                                    }
                                >
                                    {(option) => (
                                        <span
                                            id={valueId}
                                            class="visually-hidden"
                                        >
                                            {fullLabel(option())}
                                        </span>
                                    )}
                                </Show>
                                <IconChevronDown
                                    class="combobox-chevron"
                                    size={16}
                                />
                            </button>
                            <Show when={open()}>{options()}</Show>
                        </>
                    }
                >
                    <span class="combobox-field">
                        <input
                            ref={(el) => (anchor = el)}
                            type="text"
                            role="combobox"
                            class="combobox-input"
                            classList={{ invalid: invalid() }}
                            id={props.id}
                            name={props.name}
                            disabled={props.disabled}
                            spellcheck={false}
                            autocomplete="off"
                            aria-autocomplete="list"
                            aria-expanded={listShown()}
                            aria-controls={listShown() ? list.id : undefined}
                            aria-activedescendant={
                                listShown() ? list.activeId() : undefined
                            }
                            aria-label={props.label}
                            aria-labelledby={props.labelledBy}
                            aria-invalid={invalid() ? true : undefined}
                            aria-describedby={describedBy()}
                            placeholder={props.placeholder}
                            value={text()}
                            onInput={onInput}
                            onKeyDown={onInputKeyDown}
                            onClick={() => {
                                if (!open()) openList('pointer', -1);
                            }}
                        />
                        <IconChevronDown class="combobox-chevron" size={16} />
                    </span>
                    <Show when={open()}>
                        <div
                            ref={(el) => (popup = el)}
                            class="combobox-popup"
                            // The focus stays in the input, as above.
                            onMouseDown={(e) => e.preventDefault()}
                        >
                            <Show when={shown().length > 0}>{options()}</Show>
                            <Show
                                when={matched().length === 0 && props.noResults}
                            >
                                <p class="combobox-note">{props.noResults}</p>
                            </Show>
                            <Show when={more() && props.moreResults}>
                                <p class="combobox-note">{props.moreResults}</p>
                            </Show>
                        </div>
                    </Show>
                    {/* Always on the page: a live region that appears with its
                    text is not read. */}
                    <span role="status" class="visually-hidden">
                        {status()}
                    </span>
                </Show>
            </div>
            {/* Made only with errors: FieldError needs the i18n context. */}
            <Show when={hasErrors()}>
                <FieldError for={errorsFor()} errors={props.errors} />
            </Show>
        </>
    );
}
