import { For, type JSX } from 'solid-js';
import type { ErrorItem } from '@shared/api/types';
import FieldError, { errorId } from './FieldError';
import { IconChevronDown } from '@shared/ui/icons';
import './forms.scss';

type SelectProps<T extends string> = {
    id: string;
    /** JSX for a name with more beside it (a connection and its provider). */
    label: JSX.Element;
    /** Above the select; otherwise for screen readers only. */
    showLabel?: boolean;
    value: T;
    onChange: (value: T) => void;
    options: readonly { value: T; label: string; disabled?: boolean }[];
    disabled?: boolean;
    /** The server's errors about it, shown right under it. */
    errors?: ErrorItem[];
};

/**
 * One of a list, as the forms show it: the native select (the keyboard and
 * a phone's own picker work), dressed as a field with a chevron, its label,
 * and its errors directly below, wired as Field's.
 */
export default function Select<T extends string>(props: SelectProps<T>) {
    const invalid = () => !!props.errors?.length;

    return (
        <div class="field-wrap select-wrap">
            <label
                for={props.id}
                class={props.showLabel ? 'field-label' : 'visually-hidden'}
            >
                {props.label}
            </label>
            <div class="select-box">
                <select
                    id={props.id}
                    class="select-input"
                    classList={{ invalid: invalid() }}
                    value={props.value}
                    disabled={props.disabled}
                    aria-invalid={invalid()}
                    aria-describedby={invalid() ? errorId(props.id) : undefined}
                    onChange={(e) =>
                        // Only the options' values can be chosen.
                        props.onChange(e.currentTarget.value as T)
                    }
                >
                    <For each={props.options}>
                        {(option) => (
                            <option
                                value={option.value}
                                disabled={option.disabled}
                                selected={option.value === props.value}
                            >
                                {option.label}
                            </option>
                        )}
                    </For>
                </select>
                <IconChevronDown class="select-arrow" aria-hidden="true" />
            </div>
            <FieldError for={props.id} errors={props.errors} />
        </div>
    );
}
