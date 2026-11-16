import { For, Show } from 'solid-js';
import { IconCheck } from '@shared/ui/icons';
import {
    createOptionList,
    hasValue,
    indexOfValue,
    toggleValue,
    type ListOption,
} from './option-list';
import './listbox.scss';

// T comes from the options only (NoInfer elsewhere): a setter such as
// setValue would otherwise make T its own argument type.
type ListboxCommon<T> = {
    options: readonly ListOption<T>[];
    /** The list's accessible name, when no visible label names it. */
    label?: string;
    /** The id of a visible element that names the list. */
    labelledBy?: string;
    class?: string;
};

type ListboxSingle<T> = ListboxCommon<T> & {
    multiple?: false;
    /** The selected value, or undefined for none. */
    value: NoInfer<T> | undefined;
    onChange: (value: NoInfer<T>) => void;
};

type ListboxMultiple<T> = ListboxCommon<T> & {
    multiple: true;
    /** The selected values. */
    value: readonly NoInfer<T>[];
    onChange: (value: NoInfer<T>[]) => void;
};

export type ListboxProps<T> = ListboxSingle<T> | ListboxMultiple<T>;

/**
 * A list of options that is always in view, as WAI-ARIA's listbox pattern.
 * The focus stays on the list; aria-activedescendant points at the active
 * option. With one choice, the selection follows the arrows; with
 * `multiple`, Space, Shift+arrows and Ctrl+A select. Values compare with
 * Object.is. onChange runs only when the selection changes. It has no
 * text of its own: the caller gives the labels.
 */
export default function Listbox<T>(props: ListboxProps<T>) {
    const list = createOptionList(() => props.options);
    // A press of the pointer gives the focus: the option it makes active
    // gets no outline (only the keyboard's does).
    let pressed = false;

    const selected = (value: T) =>
        props.multiple
            ? hasValue(props.value, value)
            : props.value !== undefined && Object.is(props.value, value);

    // The first enabled option that is selected, or -1.
    const selectedIndex = () =>
        props.options.findIndex((o, i) => list.enabled(i) && selected(o.value));

    function choose(index: number) {
        const option = props.options[index];
        if (!option || option.disabled) return;
        if (props.multiple) {
            props.onChange(toggleValue(props.value, option.value));
        } else if (!selected(option.value)) {
            props.onChange(option.value);
        }
    }

    // Selects the option at `index` if it is not; with one choice it
    // replaces the selection (the selection follows the arrows).
    function select(index: number) {
        const option = props.options[index];
        if (!option || option.disabled || selected(option.value)) return;
        if (props.multiple) props.onChange([...props.value, option.value]);
        else props.onChange(option.value);
    }

    // Ctrl+A: all enabled options; if they are all selected already, none.
    // A disabled option keeps its state.
    function toggleAll() {
        if (!props.multiple) return;
        const current = props.value;
        const enabled = props.options.filter((o) => !o.disabled);
        const all = enabled.every((o) => hasValue(current, o.value));
        const next = all
            ? current.filter((v) => indexOfValue(enabled, v) < 0)
            : [
                  ...current,
                  ...enabled
                      .map((o) => o.value)
                      .filter((v) => !hasValue(current, v)),
              ];
        if (next.length !== current.length) props.onChange(next);
    }

    function moved(index: number | undefined, extend: boolean) {
        if (index === undefined) return;
        list.scrollActiveIntoView();
        if (!props.multiple || extend) select(index);
    }

    function onKeyDown(e: KeyboardEvent) {
        pressed = false;
        if (e.altKey) return;
        const ctrl = e.ctrlKey || e.metaKey;
        if (props.multiple && ctrl && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            toggleAll();
            return;
        }
        if (ctrl) return;

        const before = list.active();
        const index = list.move(e.key);
        if (index !== undefined) {
            e.preventDefault();
            // Shift+arrow selects the option it moves to (APG: extends the
            // selection); Home, End and the pages only move.
            const extend =
                e.shiftKey &&
                (e.key === 'ArrowDown' || e.key === 'ArrowUp') &&
                index !== before;
            moved(index, extend);
            return;
        }

        if (e.key === ' ' && !list.typing()) {
            e.preventDefault();
            if (props.multiple) choose(list.active());
            return;
        }
        if (e.key.length === 1) {
            e.preventDefault();
            moved(list.typeAhead(e.key), false);
        }
    }

    // With one choice the active option is the selected one; otherwise
    // the list keeps its active option, or starts at the first selected.
    function onFocus() {
        const by = pressed ? 'pointer' : 'keys';
        pressed = false;
        const chosen = selectedIndex();
        if (!props.multiple && chosen >= 0) list.setActive(chosen, by);
        else if (!list.enabled(list.active())) {
            list.setActive(chosen >= 0 ? chosen : list.firstEnabled(), by);
        }
        list.scrollActiveIntoView();
    }

    function onClick(index: number) {
        pressed = false;
        if (!list.enabled(index)) return;
        list.setActive(index, 'pointer');
        choose(index);
    }

    return (
        <ul
            id={list.id}
            role="listbox"
            tabIndex={0}
            class={props.class ? `listbox ${props.class}` : 'listbox'}
            aria-label={props.label}
            aria-labelledby={props.labelledBy}
            aria-multiselectable={props.multiple ? true : undefined}
            aria-activedescendant={list.activeId()}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onMouseDown={() => (pressed = true)}
        >
            <For each={props.options}>
                {(option, i) => (
                    <li
                        id={list.optionId(i())}
                        role="option"
                        class="listbox-option"
                        classList={{
                            'listbox-option--active': list.active() === i(),
                            'listbox-option--keys':
                                list.active() === i() && list.activeByKeys(),
                        }}
                        aria-selected={selected(option.value)}
                        aria-disabled={option.disabled ? true : undefined}
                        aria-labelledby={`${list.optionId(i())}-label`}
                        aria-describedby={
                            option.hint
                                ? `${list.optionId(i())}-hint`
                                : undefined
                        }
                        onClick={() => onClick(i())}
                    >
                        <IconCheck class="listbox-check" size={16} />
                        <span class="listbox-text">
                            <span
                                id={`${list.optionId(i())}-label`}
                                class="listbox-label"
                            >
                                {option.label}
                            </span>
                            <Show when={option.hint}>
                                <span
                                    id={`${list.optionId(i())}-hint`}
                                    class="listbox-hint"
                                >
                                    {option.hint}
                                </span>
                            </Show>
                        </span>
                    </li>
                )}
            </For>
        </ul>
    );
}
