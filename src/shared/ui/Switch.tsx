import { createUniqueId, Show, type JSX } from 'solid-js';
import './switch.scss';

type SwitchProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    /** What turning it on means, under the label. */
    description?: JSX.Element;
};

/**
 * An on/off setting: a checkbox with the switch role, its label and an
 * explanation beside it; the whole row toggles it.
 */
export default function Switch(props: SwitchProps) {
    const id = createUniqueId();
    return (
        <label class="switch-row" for={id}>
            <span class="switch-text">
                <span class="switch-label">{props.label}</span>
                <Show when={props.description}>
                    <span class="switch-description">{props.description}</span>
                </Show>
            </span>
            <input
                id={id}
                class="switch"
                type="checkbox"
                role="switch"
                checked={props.checked}
                onChange={(e) => props.onChange(e.currentTarget.checked)}
            />
        </label>
    );
}
