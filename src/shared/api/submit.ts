import { createSignal } from 'solid-js';
import {
    useMutation,
    useQueryClient,
    type MutationOptions,
    type QueryClient,
} from '@tanstack/solid-query';
import { ApiError } from './client';
import { groupErrors, type FormErrors } from './errors';
import type { ErrorItem } from './types';

const NoErrors: FormErrors = {};

type OnFail = (errors: ErrorItem[]) => FormErrors | void;

/**
 * A form's save, as a TanStack mutation: a busy flag while a call is out,
 * and its errors grouped by the form's `fields` (the rest under FORM).
 * Made with the component: it takes the session's QueryClient.
 *
 * Every save goes through a mutation description (`…Mutation` in a
 * feature's api.ts): `mutation(describe)` gives `run(vars, onOk)` and
 * `runFor(key, vars, onOk)`. The description's onSuccess does the cache
 * work; `onOk` does only the form's (close, go on), after it. `pending`
 * keeps the form busy around work of several steps.
 *
 * A list whose rows act on their own (a switch per row) saves each row with
 * `runFor(key, …)`: `busy(key)` and `errors(key)` are that row's, so one row
 * that saves or fails leaves the others as they are.
 */
export function createSubmit(fields: readonly string[] = []) {
    // A context hook: here, while the component is made, never in a handler.
    const queryClient = useQueryClient();
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

    /** Busy for one key while `work` runs. */
    function aroundKey(key: string) {
        return async <R>(work: () => Promise<R>): Promise<R> => {
            count(key, 1);
            try {
                return await work();
            } finally {
                count(key, -1);
            }
        };
    }

    const showKey = (key: string) => (value: FormErrors) =>
        setKeyErrors(key, value);

    /**
     * Sends `call` inside `around` (which keeps it busy). An ApiError is
     * grouped by the fields (or what `onFail` makes of it, when it returns
     * something); anything else is a bug and is thrown. The errors are shown
     * only after `around` ends: the form's inputs are enabled again, so
     * ErrorSummary can move the focus to the first invalid one.
     */
    async function send<T>(
        around: <R>(work: () => Promise<R>) => Promise<R>,
        show: (value: FormErrors) => void,
        call: () => Promise<T>,
        onOk?: (data: T) => unknown,
        onFail?: OnFail
    ): Promise<boolean> {
        let failed: FormErrors | undefined;
        const ok = await around(async () => {
            let data: T;
            try {
                data = await call();
            } catch (e) {
                if (!(e instanceof ApiError)) throw e;
                failed = onFail?.(e.errors) ?? groupErrors(e.errors, fields);
                return false;
            }
            show({});
            await onOk?.(data);
            return true;
        });
        if (failed) show(failed);
        return ok;
    }

    /**
     * Saves through a mutation description: `describe` gets the session's
     * client, for its cache work in onSuccess. Made with the component (a
     * useMutation inside). `run` and `runFor` are busy until the mutation
     * and `onOk` are done, and answer true on success.
     */
    function mutation<TData, TVariables, TOnMutateResult = unknown>(
        describe: (
            queryClient: QueryClient
        ) => MutationOptions<TData, Error, TVariables, TOnMutateResult>
    ) {
        const saving = useMutation(
            () => describe(queryClient),
            () => queryClient
        );
        return {
            run: (
                variables: TVariables,
                onOk?: (data: TData) => unknown,
                onFail?: OnFail
            ) =>
                send(
                    pending,
                    setErrors,
                    () => saving.mutateAsync(variables),
                    onOk,
                    onFail
                ),
            runFor: (
                key: string,
                variables: TVariables,
                onOk?: (data: TData) => unknown,
                onFail?: OnFail
            ) =>
                send(
                    aroundKey(key),
                    showKey(key),
                    () => saving.mutateAsync(variables),
                    onOk,
                    onFail
                ),
        };
    }

    return { busy, errors, setErrors, pending, mutation };
}
