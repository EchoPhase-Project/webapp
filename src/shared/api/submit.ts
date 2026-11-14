import { createSignal } from 'solid-js';
import {
    useMutation,
    useQueryClient,
    type MutationOptions,
    type QueryClient,
} from '@tanstack/solid-query';
import { ApiError, type ApiResult } from './client';
import { groupErrors, type FormErrors } from './errors';
import type { ErrorItem } from './types';

const NoErrors: FormErrors = {};

type OnFail = (errors: ErrorItem[]) => FormErrors | void;

/** Whether a call answered an ApiResult (a function on send()), not data. */
function isApiResult(value: unknown): value is ApiResult<unknown> {
    if (!value || typeof value !== 'object') return false;
    const result = value as { ok?: unknown; data?: unknown; errors?: unknown };
    const keys = Object.keys(value).length;
    return (
        (result.ok === true && 'data' in value && keys === 2) ||
        (result.ok === false && Array.isArray(result.errors) && keys === 2)
    );
}

/**
 * The data of what a transitional call answered: data as is, an ApiResult
 * unwrapped, and its failure thrown as an ApiError (the status of an
 * ApiResult is not known: 0).
 */
async function unwrap(call: () => Promise<unknown>): Promise<unknown> {
    const answer = await call();
    if (!isApiResult(answer)) return answer;
    if (answer.ok) return answer.data;
    throw new ApiError(answer.errors, 0);
}

/**
 * A form's save, as a TanStack mutation: a busy flag while a call is out,
 * and its errors grouped by the form's `fields` (the rest under FORM).
 * Made with the component: it takes the session's QueryClient.
 *
 * A mutation description (`…Mutation` in a feature's api.ts) saves through
 * `mutation(describe)`: `run(vars, onOk)`, or `runFor(key, vars, onOk)`.
 * The description's onSuccess does the cache work; `onOk` does only the
 * form's (close, go on), after it.
 *
 * A list whose rows act on their own (a switch per row) saves each row with
 * `runFor(key, …)`: `busy(key)` and `errors(key)` are that row's, so one row
 * that saves or fails leaves the others as they are.
 */
export function createSubmit(fields: readonly string[] = []) {
    // A context hook: here, while the component is made, never in a handler.
    const queryClient = useQueryClient();
    // Transitional (until step 10): run(call) and runFor(key, call) of the
    // features whose api.ts has no descriptions yet go through this one.
    const calls = useMutation(
        () => ({ mutationFn: unwrap }),
        () => queryClient
    );
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

    /**
     * Transitional (removed in step 10; new code uses `mutation`): sends
     * `call`, busy until it and `onOk` are done. `call` answers data or an
     * ApiResult. A failure shows its errors (or what `onFail` makes of them,
     * when it returns something); a success clears them and hands the data
     * to `onOk`. True on success.
     */
    function run<T>(
        call: () => Promise<ApiResult<T>>,
        onOk?: (data: T) => unknown,
        onFail?: OnFail
    ): Promise<boolean>;
    function run<T>(
        call: () => Promise<T>,
        onOk?: (data: T) => unknown,
        onFail?: OnFail
    ): Promise<boolean>;
    function run(
        call: () => Promise<unknown>,
        onOk?: (data: unknown) => unknown,
        onFail?: OnFail
    ): Promise<boolean> {
        return send(
            pending,
            setErrors,
            () => calls.mutateAsync(call),
            onOk,
            onFail
        );
    }

    /**
     * Transitional, as `run`: for one key, such as a row's id. `busy(key)`
     * while it is out, and its errors under `errors(key)`. Other keys and
     * the form are not touched.
     */
    function runFor<T>(
        key: string,
        call: () => Promise<ApiResult<T>>,
        onOk?: (data: T) => unknown,
        onFail?: OnFail
    ): Promise<boolean>;
    function runFor<T>(
        key: string,
        call: () => Promise<T>,
        onOk?: (data: T) => unknown,
        onFail?: OnFail
    ): Promise<boolean>;
    function runFor(
        key: string,
        call: () => Promise<unknown>,
        onOk?: (data: unknown) => unknown,
        onFail?: OnFail
    ): Promise<boolean> {
        return send(
            aroundKey(key),
            showKey(key),
            () => calls.mutateAsync(call),
            onOk,
            onFail
        );
    }

    return { busy, errors, setErrors, pending, run, runFor, mutation };
}
