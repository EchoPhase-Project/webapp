import { Show, type JSX } from 'solid-js';
import './forms.scss';

type CheckboxProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** What it is; JSX for a name with badges (a workflow, "main"). */
    label: JSX.Element;
    /** What ticking it means, or more about it, under the label. */
    description?: JSX.Element;
    disabled?: boolean;
    name?: string;
    value?: string;
};

/**
 * An option of a form, sent with it: a card with a border, the box, its
 * label and a line under it; the whole card ticks it, and a ticked one is
 * in the accent. A setting saved at once is a Switch instead.
 */
export default function Checkbox(props: CheckboxProps) {
    return (
        <label class="choice">
            <input
                type="checkbox"
                name={props.name}
                value={props.value}
                checked={props.checked}
                disabled={props.disabled}
                onChange={(e) => props.onChange(e.currentTarget.checked)}
            />
            <span class="choice-text">
                <strong class="choice-label">{props.label}</strong>
                <Show when={props.description}>
                    <span class="muted">{props.description}</span>
                </Show>
            </span>
        </label>
    );
}
