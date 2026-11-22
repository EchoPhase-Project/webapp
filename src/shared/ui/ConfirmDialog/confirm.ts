import { createSignal } from 'solid-js';
import type { MutationOptions, QueryClient } from '@tanstack/solid-query';
import type { FormErrors } from '@shared/api/errors';
import { createSubmit } from '@shared/api/submit';

/**
 * An action asked about first, in a `ConfirmDialog`: `ask(item)` opens the
 * dialog about the item, and `dialog` is spread on it
 * (`<ConfirmDialog {...remove.dialog} title=… confirm=…>`). The yes sends
 * the mutation description with `variables(item)`; the dialog closes only
 * when it succeeds (then `onOk` runs, for the page's steps: go elsewhere).
 * A failure stays in the dialog, at its top; opening and cancelling clear
 * the errors. Made with the component (a createSubmit inside).
 *
 * A dialog about the page itself (delete this package, revoke all sessions)
 * passes what it is about as the item: the entity, or a word such as 'all'.
 */
export function createConfirm<T, TData, TVariables, TOnMutateResult = unknown>(
    describe: (
        queryClient: QueryClient
    ) => MutationOptions<TData, Error, TVariables, TOnMutateResult>,
    variables: (item: T) => TVariables,
    onOk?: (data: TData, item: T) => unknown
) {
    const submit = createSubmit();
    const action = submit.mutation(describe);
    const [item, setItem] = createSignal<T | null>(null);

    /** Opens the dialog about `next`, without the errors of a last try. */
    function ask(next: T) {
        submit.setErrors({});
        setItem(() => next);
    }

    /** Closes the dialog; its errors go with it. */
    function cancel() {
        setItem(null);
        submit.setErrors({});
    }

    /** The yes: true when the action succeeded (the dialog then closed). */
    function confirm(target: T): Promise<boolean> {
        if (submit.busy()) return Promise.resolve(false);
        return action.run(variables(target), async (data) => {
            setItem(null);
            await onOk?.(data, target);
        });
    }

    return {
        ask,
        cancel,
        confirm,
        /** What the open dialog is about; null while it is closed. */
        item,
        /** While the action runs. */
        busy: () => submit.busy(),
        /** Why the last try failed (shown in the dialog). */
        errors: (): FormErrors => submit.errors(),
        /** The props of the `ConfirmDialog`: spread them on it. */
        dialog: {
            get item() {
                return item();
            },
            get busy() {
                return submit.busy();
            },
            get errors() {
                return submit.errors();
            },
            onConfirm: (target: T) => void confirm(target),
            onCancel: cancel,
        },
    };
}
