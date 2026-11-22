import { createUniqueId, For, Show, type JSX } from 'solid-js';
import type { ErrorItem } from '@shared/api/types';
import FieldError, { errorId } from './FieldError';
import './forms.scss';

type RadioOption<T extends string> = {
    value: T;
    label: JSX.Element;
    /** What choosing it means, under the label. */
    description?: JSX.Element;
    disabled?: boolean;
};

type RadioGroupProps<T extends string> = {
    /** The fieldset's id (an error summary links to it). */
    id?: string;
    /** The group's name, also its legend for screen readers. */
    legend: string;
    /** The legend above the cards; otherwise for screen readers only. */
    showLegend?: boolean;
    name: string;
    value: T;
    onChange: (value: T) => void;
    options: readonly RadioOption<T>[];
    disabled?: boolean;
    /** The server's errors about this choice, shown under the options. */
    errors?: ErrorItem[];
};

/**
 * One of a few: a fieldset with its legend and a card for each option (the
 * radio, its label and a line under it); the chosen one in the accent. Its
 * errors show under the options, wired for screen readers: the group is
 * described by them (and takes the focus from an error summary), and each
 * radio is aria-invalid.
 */
export default function RadioGroup<T extends string>(
    props: RadioGroupProps<T>
) {
    const fallbackId = createUniqueId();
    const id = () => props.id ?? fallbackId;
    const invalid = () => !!props.errors?.length;

    return (
        <fieldset
            id={id()}
            class="choices"
            classList={{ invalid: invalid() }}
            aria-describedby={invalid() ? errorId(id()) : undefined}
            tabindex={invalid() ? -1 : undefined}
        >
            <legend
                class={props.showLegend ? 'field-label' : 'visually-hidden'}
            >
                {props.legend}
            </legend>
            <For each={props.options}>
                {(option) => (
                    <label class="choice">
                        <input
                            type="radio"
                            name={props.name}
                            value={option.value}
                            checked={props.value === option.value}
                            disabled={props.disabled || option.disabled}
                            aria-invalid={invalid()}
                            onChange={() => props.onChange(option.value)}
                        />
                        <span class="choice-text">
                            <strong class="choice-label">{option.label}</strong>
                            <Show when={option.description}>
                                <span class="muted">{option.description}</span>
                            </Show>
                        </span>
                    </label>
                )}
            </For>
            <FieldError for={id()} errors={props.errors} />
        </fieldset>
    );
}
