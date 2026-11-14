import { splitProps, type JSX } from 'solid-js';
import type { ErrorItem } from '@shared/api/types';
import FieldError, { errorId } from './FieldError';
import './forms.scss';

export type TextAreaProps = Omit<
    JSX.TextareaHTMLAttributes<HTMLTextAreaElement>,
    'id' | 'class'
> & {
    id: string;
    label: string;
    /** Above the text area; otherwise for screen readers only. */
    showLabel?: boolean;
    /** The server's errors about this text, shown right under it. */
    errors?: ErrorItem[];
};

/**
 * A few lines of text as the forms show them: the field's frame, its label,
 * and its errors directly below, wired for screen readers (aria-invalid,
 * aria-describedby).
 */
export default function TextArea(props: TextAreaProps) {
    const [own, textarea] = splitProps(props, [
        'id',
        'label',
        'showLabel',
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
            <textarea
                {...textarea}
                id={own.id}
                class="field-textarea"
                classList={{ invalid: invalid() }}
                aria-invalid={invalid()}
                aria-describedby={invalid() ? errorId(own.id) : undefined}
            />
            <FieldError for={own.id} errors={own.errors} />
        </div>
    );
}
