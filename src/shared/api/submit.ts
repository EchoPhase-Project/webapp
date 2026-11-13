import { createSignal } from 'solid-js';
import type { ApiResult } from './client';
import { groupErrors, type FormErrors } from './errors';
import type { ErrorItem } from './types';

/**
 * A form's save: a busy flag while a call is out, and its errors grouped by
 * the form's `fields` (the rest under FORM).
 */
export function createSubmit(fields: readonly string[] = []) {
    const [busy, setBusy] = createSignal(false);
    const [errors, setErrors] = createSignal<FormErrors>({});

    /** Busy while `work` runs; errors are left as they are. */
    async function pending<T>(work: () => Promise<T>): Promise<T> {
        setBusy(true);
        try {
            return await work();
        } finally {
            setBusy(false);
        }
    }

    /**
     * Sends `call`, busy until it and `onOk` are done. A failure shows its
     * errors (or what `onFail` makes of them, when it returns something);
     * a success clears them and hands the data to `onOk`. True on success.
     */
    function run<T>(
        call: () => Promise<ApiResult<T>>,
        onOk?: (data: T) => unknown,
        onFail?: (errors: ErrorItem[]) => FormErrors | void
    ): Promise<boolean> {
        return pending(async () => {
            const result = await call();
            if (!result.ok) {
                setErrors(
                    onFail?.(result.errors) ??
                        groupErrors(result.errors, fields)
                );
                return false;
            }
            setErrors({});
            await onOk?.(result.data);
            return true;
        });
    }

    return { busy, errors, setErrors, pending, run };
}
