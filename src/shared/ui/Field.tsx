import { splitProps, type Component, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { ErrorItem } from '@shared/api/types';
import FieldError, { errorId } from './FieldError';
import './forms.scss';

type FieldProps = Omit<
    JSX.InputHTMLAttributes<HTMLInputElement>,
    'id' | 'name' | 'class'
> & {
    id: string;
    name: string;
    label: string;
    /** Above the field; otherwise for screen readers, the placeholder shows it. */
    showLabel?: boolean;
    icon?: Component<{ class?: string }>;
    /** The server's errors about this field, shown right under it. */
    errors?: ErrorItem[];
};

/**
 * One input as the forms show it: an optional icon, the input, and its
 * errors directly below, wired for screen readers (aria-invalid,
 * aria-describedby).
 */
export default function Field(props: FieldProps) {
    const [own, input] = splitProps(props, [
        'id',
        'name',
        'label',
        'showLabel',
        'icon',
        'errors',
    ]);
    const invalid = () => !!own.errors?.length;

    return (
        <div class="field-wrap">
            <label
                for={own.id}
                class={own.showLabel ? 'field-label' : 'visually-hidden'}
            >
                {own.label}
            </label>
            <div class="field" classList={{ invalid: invalid() }}>
                {own.icon && (
                    <Dynamic component={own.icon} class="field-icon" />
                )}
                <input
                    placeholder={own.showLabel ? undefined : own.label}
                    {...input}
                    id={own.id}
                    name={own.name}
                    class="field-input"
                    aria-invalid={invalid()}
                    aria-describedby={invalid() ? errorId(own.id) : undefined}
                />
            </div>
            <FieldError for={own.id} errors={own.errors} />
        </div>
    );
}
