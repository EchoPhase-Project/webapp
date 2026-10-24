import { createEffect, For, Show } from 'solid-js';
import { FORM, type FormErrors } from '@shared/api/errors';
import { useI18n } from '@shared/i18n/i18n-context';

/**
 * A form's errors that are about no field in particular (a wrong password,
 * the network), at its top; field errors show under their field (Field).
 * After a failed submit focus goes here when there are such errors, else to
 * the first invalid field, so screen readers announce what went wrong.
 */
export default function ErrorSummary(props: {
    errors: FormErrors;
    /** Input id for a field name, e.g. "login-username". */
    inputId: (field: string) => string;
}) {
    const i18n = useI18n();
    let ref: HTMLDivElement | undefined;

    const general = () => props.errors[FORM] ?? [];

    createEffect(() => {
        if (general().length > 0) {
            ref?.focus();
            return;
        }
        const first = Object.keys(props.errors)[0];
        if (first) document.getElementById(props.inputId(first))?.focus();
    });

    return (
        <Show when={general().length > 0}>
            <div class="error-summary" role="alert" tabindex="-1" ref={ref}>
                <ul class="errorlist">
                    <For each={general()}>
                        {(item) => <li>{i18n.t(item.code, item.message)}</li>}
                    </For>
                </ul>
            </div>
        </Show>
    );
}
