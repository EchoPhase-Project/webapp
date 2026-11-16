import { createEffect, createSignal, For, Show } from 'solid-js';
import { createDismiss } from '@shared/lib/dismiss';
import { IconCheck, IconChevronDown } from '@shared/ui/icons';
import {
    createOptionList,
    indexOfValue,
    type ListOption,
} from '@shared/ui/Listbox';
import { createPopupPlacement } from './popup';
import './combobox.scss';

// T comes from the options only (NoInfer elsewhere), as in Listbox.
export type ComboboxProps<T> = {
    options: readonly ListOption<T>[];
    /** The selected value, or undefined for none. */
    value: NoInfer<T> | undefined;
    /** Runs when the user picks another value (not the selected one). */
    onChange: (value: NoInfer<T>) => void;
    /**
     * The control's accessible name, when no visible label names it. The
     * button's name is then "label: full label of the selected option".
     */
    label?: string;
    /** The id of a visible element that names the control. */
    labelledBy?: string;
    /** Shown on the button while nothing is selected. */
    placeholder?: string;
    /** Added to the root element, so the caller can dress the button. */
    class?: string;
    // Step 4: `editable` (an input with list autocomplete) comes here.
};

/**
 * A select-only combobox, as WAI-ARIA's pattern: a button that shows the
 * selected value (its `short` label, if it has one) and opens a list of
 * the options under it, or over it when there is no room below. The focus
 * stays on the button; aria-activedescendant points at the active option.
 * Values compare with Object.is; onChange runs only for another value. It
 * has no text of its own: the caller gives the labels.
 */
export default function Combobox<T>(props: ComboboxProps<T>) {
    const list = createOptionList(() => props.options);
    const [open, setOpen] = createSignal(false);
    let root: HTMLDivElement | undefined;
    let button: HTMLButtonElement | undefined;
    let popup: HTMLUListElement | undefined;
    const valueId = `${list.id}-value`;

    const selectedIndex = () =>
        props.value === undefined
            ? -1
            : indexOfValue(props.options, props.value);
    const selected = () => props.options[selectedIndex()];

    const dropUp = createPopupPlacement(
        () => button,
        () => popup,
        open
    );
    createDismiss(() => root, open, close);

    // The active option stays in view (the list has a scroll of its own).
    createEffect(() => {
        if (open() && list.active() >= 0) list.scrollActiveIntoView();
    });

    function close() {
        setOpen(false);
    }

    // Opens the list; the active option is the selected one, or the first
    // enabled one, unless `index` says another.
    function openList(index?: number) {
        const chosen = selectedIndex();
        list.setActive(
            index ?? (list.enabled(chosen) ? chosen : list.firstEnabled())
        );
        setOpen(true);
    }

    function choose(index: number) {
        const option = props.options[index];
        if (option && !option.disabled && index !== selectedIndex()) {
            props.onChange(option.value);
        }
        close();
    }

    function onKeyDownClosed(e: KeyboardEvent) {
        switch (e.key) {
            case 'Enter':
            case ' ':
                if (e.key === ' ' && list.typing()) break;
                e.preventDefault();
                openList();
                return;
            case 'ArrowDown':
            case 'ArrowUp':
                e.preventDefault();
                // Alt+Down and Alt+Up open the list on the selected option
                // as well; Alt+Up does nothing while it is closed.
                if (e.altKey && e.key === 'ArrowUp') return;
                openList();
                return;
            case 'Home':
                e.preventDefault();
                openList(list.firstEnabled());
                return;
            case 'End':
                e.preventDefault();
                openList(-1);
                list.move('End');
                return;
        }
        if (e.key.length === 1 && !e.altKey) {
            e.preventDefault();
            openList();
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

    // A button clicks on Enter (keydown) and on Space (keyup); the keys
    // above already did their work.
    function onKeyUp(e: KeyboardEvent) {
        if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
    }

    // The focus went somewhere outside (Tab, a click on another control).
    function onFocusOut(e: FocusEvent) {
        const next = e.relatedTarget;
        if (!(next instanceof Node) || !root?.contains(next)) close();
    }

    function onOptionClick(index: number) {
        if (list.enabled(index)) choose(index);
    }

    const buttonLabel = () => {
        const option = selected();
        if (props.label === undefined) return undefined;
        return option ? `${props.label}: ${option.label}` : props.label;
    };
    const buttonLabelledBy = () => {
        if (props.labelledBy === undefined) return undefined;
        return selected() ? `${props.labelledBy} ${valueId}` : props.labelledBy;
    };

    return (
        <div
            ref={root}
            class={props.class ? `combobox ${props.class}` : 'combobox'}
            data-open={open()}
            data-drop-up={dropUp()}
            onFocusOut={onFocusOut}
        >
            {/* Step 4: the editable mode puts an input here instead. */}
            <button
                ref={button}
                type="button"
                role="combobox"
                class="combobox-button"
                aria-haspopup="listbox"
                aria-expanded={open()}
                aria-controls={open() ? list.id : undefined}
                aria-activedescendant={open() ? list.activeId() : undefined}
                aria-label={buttonLabel()}
                aria-labelledby={buttonLabelledBy()}
                onClick={() => (open() ? close() : openList())}
                onKeyDown={onKeyDown}
                onKeyUp={onKeyUp}
            >
                <span class="combobox-value">
                    {selected()
                        ? (selected()?.short ?? selected()?.label)
                        : props.placeholder}
                </span>
                {/* The full label, for the name given by labelledBy. */}
                <Show when={props.labelledBy !== undefined && selected()}>
                    {(option) => (
                        <span id={valueId} class="visually-hidden">
                            {option().label}
                        </span>
                    )}
                </Show>
                <IconChevronDown class="combobox-chevron" size={16} />
            </button>

            <Show when={open()}>
                <ul
                    ref={popup}
                    id={list.id}
                    role="listbox"
                    tabIndex={-1}
                    class="combobox-list"
                    aria-label={props.label}
                    aria-labelledby={props.labelledBy}
                    // The focus stays on the button: a press on the list
                    // must not take it (that would close the list).
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <For each={props.options}>
                        {(option, i) => (
                            <li
                                id={list.optionId(i())}
                                role="option"
                                class="combobox-option"
                                classList={{
                                    'combobox-option--active':
                                        list.active() === i(),
                                }}
                                aria-selected={i() === selectedIndex()}
                                aria-disabled={
                                    option.disabled ? true : undefined
                                }
                                aria-labelledby={`${list.optionId(i())}-label`}
                                aria-describedby={
                                    option.hint
                                        ? `${list.optionId(i())}-hint`
                                        : undefined
                                }
                                onMouseEnter={() => {
                                    if (list.enabled(i())) list.setActive(i());
                                }}
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
                                            {option.hint}
                                        </span>
                                    </Show>
                                </span>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
        </div>
    );
}
