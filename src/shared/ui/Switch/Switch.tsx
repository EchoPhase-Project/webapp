import { createUniqueId, Show, type JSX } from 'solid-js';
import type { ErrorItem } from '@shared/api/types';
import FieldError, { errorId } from '@shared/ui/forms/FieldError';
import './switch.scss';

type SwitchProps = {
    /** The box's id (an error summary links to it). */
    id?: string;
    /** The box's name in its form. */
    name?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    /** What turning it on means, under the label. */
    description?: JSX.Element;
    /** Shown but not changeable for now (saving). */
    disabled?: boolean;
    /** The server's errors about it, shown under the row. */
    errors?: ErrorItem[];
};

/**
 * An on/off setting: a checkbox with the switch role, its label and an
 * explanation beside it; the whole row toggles it. Its errors show under
 * the row, wired for screen readers (aria-invalid, aria-describedby).
 */
export default function Switch(props: SwitchProps) {
    const fallbackId = createUniqueId();
    const id = () => props.id ?? fallbackId;
    const invalid = () => !!props.errors?.length;

    return (
        <>
            <label
                class="switch-row"
                classList={{ invalid: invalid() }}
                for={id()}
            >
                <span class="switch-text">
                    <span class="switch-label">{props.label}</span>
                    <Show when={props.description}>
                        <span class="switch-description">
                            {props.description}
                        </span>
                    </Show>
                </span>
                <input
                    id={id()}
                    name={props.name}
                    class="switch"
                    type="checkbox"
                    role="switch"
                    checked={props.checked}
                    disabled={props.disabled}
                    aria-invalid={invalid()}
                    aria-describedby={invalid() ? errorId(id()) : undefined}
                    onChange={(e) => {
                        // Controlled: it shows `checked`, not the click. The
                        // owner's new value moves it (a save that fails leaves it).
                        const wanted = e.currentTarget.checked;
                        e.currentTarget.checked = props.checked;
                        props.onChange(wanted);
                    }}
                />
            </label>
            {/* Made only with errors: FieldError needs the i18n context. */}
            <Show when={invalid()}>
                <FieldError for={id()} errors={props.errors} />
            </Show>
        </>
    );
}
