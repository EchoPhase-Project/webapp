import { createSignal } from 'solid-js';
import type { ApiResult } from './client';
import { groupErrors, type FormErrors } from './errors';
import type { ErrorItem } from './types';

const NoErrors: FormErrors = {};

/**
 * A form's save: a busy flag while a call is out, and its errors grouped by
 * the form's `fields` (the rest under FORM).
 *
 * A list whose rows act on their own (a switch per row) saves each row with
 * `runFor(key, …)`: `busy(key)` and `errors(key)` are that row's, so one row
 * that saves or fails leaves the others as they are.
 */
export function createSubmit(fields: readonly string[] = []) {
    const [formBusy, setFormBusy] = createSignal(false);
    const [formErrors, setErrors] = createSignal<FormErrors>({});
    // Keyed saves: how many calls are out, and the last errors, per key.
    const [out, setOut] = createSignal<Readonly<Record<string, number>>>({});
    const [keyed, setKeyed] = createSignal<
        Readonly<Record<string, FormErrors>>
    >({});

    /**
     * Without a key: whether anything saves, the form or any key. With one:
     * whether that key saves.
     */
    function busy(key?: string): boolean {
        if (key !== undefined) return (out()[key] ?? 0) > 0;
        return formBusy() || Object.keys(out()).length > 0;
    }

    /** Without a key: the form's errors. With one: that key's errors. */
    function errors(key?: string): FormErrors {
        if (key === undefined) return formErrors();
        return keyed()[key] ?? NoErrors;
    }

    function count(key: string, step: 1 | -1) {
        setOut((now) => {
            const next = { ...now, [key]: (now[key] ?? 0) + step };
            if (next[key] <= 0) delete next[key];
            return next;
        });
    }

    function setKeyErrors(key: string, value: FormErrors) {
        setKeyed((now) => {
            const next = { ...now };
            if (Object.keys(value).length > 0) next[key] = value;
            else delete next[key];
            return next;
        });
    }

    /** Busy while `work` runs; errors are left as they are. */
    async function pending<T>(work: () => Promise<T>): Promise<T> {
        setFormBusy(true);
        try {
            return await work();
        } finally {
            setFormBusy(false);
        }
    }

    /**
     * Sends `call` inside `around` (which keeps it busy). A failure's errors
     * are shown only after `around` ends: the form's inputs are enabled
     * again, so ErrorSummary can move the focus to the first invalid one.
     */
    async function send<T>(
        around: <R>(work: () => Promise<R>) => Promise<R>,
        show: (value: FormErrors) => void,
        call: () => Promise<ApiResult<T>>,
        onOk?: (data: T) => unknown,
        onFail?: (errors: ErrorItem[]) => FormErrors | void
    ): Promise<boolean> {
        let failed: FormErrors | undefined;
        const ok = await around(async () => {
            const result = await call();
            if (!result.ok) {
                failed =
                    onFail?.(result.errors) ??
                    groupErrors(result.errors, fields);
                return false;
            }
            show({});
            await onOk?.(result.data);
            return true;
        });
        if (failed) show(failed);
        return ok;
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
        return send(pending, setErrors, call, onOk, onFail);
    }

    /**
     * `run` for one key, such as a row's id: `busy(key)` while it is out,
     * and its errors under `errors(key)`. Other keys and the form are not
     * touched.
     */
    function runFor<T>(
        key: string,
        call: () => Promise<ApiResult<T>>,
        onOk?: (data: T) => unknown,
        onFail?: (errors: ErrorItem[]) => FormErrors | void
    ): Promise<boolean> {
        const around = async <R>(work: () => Promise<R>): Promise<R> => {
            count(key, 1);
            try {
                return await work();
            } finally {
                count(key, -1);
            }
        };
        return send(
            around,
            (value) => setKeyErrors(key, value),
            call,
            onOk,
            onFail
        );
    }

    return { busy, errors, setErrors, pending, run, runFor };
}
