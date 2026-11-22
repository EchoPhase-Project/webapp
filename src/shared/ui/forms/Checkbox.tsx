import { createUniqueId, Show, type JSX } from 'solid-js';
import type { ErrorItem } from '@shared/api/types';
import FieldError, { errorId } from './FieldError';
import './forms.scss';

type CheckboxProps = {
    /** The box's id (an error summary links to it). */
    id?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** What it is; JSX for a name with badges (a workflow, "main"). */
    label: JSX.Element;
    /** What ticking it means, or more about it, under the label. */
    description?: JSX.Element;
    disabled?: boolean;
    name?: string;
    value?: string;
    /** The server's errors about this option, shown under the card. */
    errors?: ErrorItem[];
};

/**
 * An option of a form, sent with it: a card with a border, the box, its
 * label and a line under it; the whole card ticks it, and a ticked one is
 * in the accent. Its errors show under the card, wired for screen readers
 * (aria-invalid, aria-describedby). A setting saved at once is a Switch
 * instead.
 */
export default function Checkbox(props: CheckboxProps) {
    const fallbackId = createUniqueId();
    const id = () => props.id ?? fallbackId;
    const invalid = () => !!props.errors?.length;

    return (
        <>
            <label class="choice" classList={{ invalid: invalid() }}>
                <input
                    type="checkbox"
                    id={id()}
                    name={props.name}
                    value={props.value}
                    checked={props.checked}
                    disabled={props.disabled}
                    aria-invalid={invalid()}
                    aria-describedby={invalid() ? errorId(id()) : undefined}
                    onChange={(e) => props.onChange(e.currentTarget.checked)}
                />
                <span class="choice-text">
                    <strong class="choice-label">{props.label}</strong>
                    <Show when={props.description}>
                        <span class="muted">{props.description}</span>
                    </Show>
                </span>
            </label>
            <FieldError for={id()} errors={props.errors} />
        </>
    );
}
