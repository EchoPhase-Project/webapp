import {
    batch,
    createComputed,
    createMemo,
    createSignal,
    on,
    untrack,
} from 'solid-js';
import { createStore, unwrap } from 'solid-js/store';
import { FORM, type FormErrors } from '@shared/api/errors';
import { createSubmit } from '@shared/api/submit';
import type { ErrorItem } from '@shared/api/types';

/** A form's values: a field name to its value (text, a flag, a list). */
export type FormValues = Record<string, unknown>;

/** The names of the fields of `V` whose value is a `T`. */
export type FieldOf<V, T> = {
    [K in keyof V]-?: V[K] extends T ? K : never;
}[keyof V] &
    string;

/** What `check` found: a message for each field, `form` for the rest. */
export type CheckResult<V> = Partial<
    Record<(keyof V & string) | 'form', string>
>;

export type FormOptions<V extends FormValues> = {
    /** The base of the ids: a field's is `${id}-${name}`. */
    id: string | (() => string);
    /**
     * The values to start from, read in a tracked scope: the saved entity.
     * When it changes, a field the user has not changed takes the new
     * value; a changed one keeps the user's.
     */
    initial: () => V;
    /** A check in the browser before the send; the server checks the rest. */
    check?: (values: V) => CheckResult<V> | false | null | undefined;
    /** Server field names that mean a field of the form (password → newPassword). */
    serverFields?: Readonly<Record<string, keyof V & string>>;
    /** Every control disabled while true (the texts still load). */
    locked?: () => boolean;
};

/** The props of a Field or a TextArea: spread them, never destructure. */
export type InputBinding = {
    readonly id: string;
    readonly name: string;
    readonly value: string;
    readonly errors: ErrorItem[] | undefined;
    readonly disabled: boolean;
    onInput: (e: { currentTarget: { value: string } }) => void;
};

/** The props of a Select, RadioGroup, TimeZoneField, MarkdownEditor, Combobox. */
export type ControlBinding<T> = {
    readonly id: string;
    readonly name: string;
    readonly value: T;
    readonly errors: ErrorItem[] | undefined;
    readonly disabled: boolean;
    onChange: (value: T) => void;
};

/** The props of a Checkbox or a Switch. */
export type ToggleBinding = {
    readonly id: string;
    readonly name: string;
    readonly checked: boolean;
    readonly errors: ErrorItem[] | undefined;
    readonly disabled: boolean;
    onChange: (checked: boolean) => void;
};

/** Texts trimmed, lists item by item: what dirty() and changed() compare. */
export function same(a: unknown, b: unknown): boolean {
    if (typeof a === 'string' && typeof b === 'string')
        return a.trim() === b.trim();
    if (Array.isArray(a) && Array.isArray(b))
        return a.length === b.length && a.every((item, i) => same(item, b[i]));
    return a === b;
}

/** A changed text, trimmed, or null when it did not change (a partial save). */
export const orNull = (value: string | undefined): string | null =>
    value === undefined ? null : value.trim();

// A list is copied: the store must not share it with the cache.
const copy = <T>(value: T): T =>
    (Array.isArray(value) ? [...(value as unknown[])] : value) as T;

const copyAll = <V extends FormValues>(values: V): V => {
    const out: FormValues = {};
    for (const key of Object.keys(values)) out[key] = copy(values[key]);
    return out as V;
};

/**
 * One form on top of createSubmit: its values, the props of its controls,
 * and its submit. `mutation`, `busy`, `errors` and `setErrors` are
 * createSubmit's, so a mutation description and `run(vars, onOk)` work as
 * in any save.
 *
 * Spread a binding on its control: `<Field {...form.input('name')} … />`.
 * Its props are getters, and a spread keeps them; a destructured binding
 * stops following the form.
 */
export function createForm<V extends FormValues>(options: FormOptions<V>) {
    const start = untrack(options.initial);
    const names = Object.keys(start) as (keyof V & string)[];
    const aliases = options.serverFields ?? {};
    const submit = createSubmit([...names, ...Object.keys(aliases)]);
    const { busy, errors, setErrors } = submit;

    const [values, setValues] = createStore<V>(copyAll(start));
    const [base, setBase] = createSignal<V>(start, { equals: false });
    const [done, setDone] = createSignal(false);
    // How many times `initial` changed: a save that saw it change takes it.
    let version = 0;

    // The saved value changed: a field still at the old one follows it.
    createComputed(
        on(
            options.initial,
            (next) => {
                const old = untrack(base);
                batch(() => {
                    for (const name of names) {
                        if (same(values[name], old[name]))
                            setValues(name as never, copy(next[name]) as never);
                    }
                    setBase(() => next);
                });
                version++;
            },
            { defer: true }
        )
    );

    const formId = () =>
        typeof options.id === 'string' ? options.id : options.id();
    const id = (name: keyof V & string) => `${formId()}-${name}`;
    const disabled = () => busy() || !!options.locked?.();

    /** The errors of a field: its own and those of its server names. */
    function errorsOf(name: keyof V & string): ErrorItem[] | undefined {
        const all = errors();
        const found = [...(all[name] ?? [])];
        for (const [server, field] of Object.entries(aliases)) {
            if (field === name) found.push(...(all[server] ?? []));
        }
        return found.length > 0 ? found : undefined;
    }

    function set<K extends keyof V & string>(name: K, value: V[K]) {
        batch(() => {
            setValues(name as never, copy(value) as never);
            setDone(false);
        });
    }

    function input(name: FieldOf<V, string>): InputBinding {
        return {
            get id() {
                return id(name);
            },
            name,
            get value() {
                return values[name] as string;
            },
            get errors() {
                return errorsOf(name);
            },
            get disabled() {
                return disabled();
            },
            onInput: (e) => set(name, e.currentTarget.value as V[typeof name]),
        };
    }

    function control<K extends keyof V & string>(
        name: K
    ): ControlBinding<V[K]> {
        return {
            get id() {
                return id(name);
            },
            name,
            get value() {
                return values[name];
            },
            get errors() {
                return errorsOf(name);
            },
            get disabled() {
                return disabled();
            },
            onChange: (value) => set(name, value),
        };
    }

    function toggle(name: FieldOf<V, boolean>): ToggleBinding {
        return {
            get id() {
                return id(name);
            },
            name,
            get checked() {
                return values[name] as boolean;
            },
            get errors() {
                return errorsOf(name);
            },
            get disabled() {
                return disabled();
            },
            onChange: (checked) => set(name, checked as V[typeof name]),
        };
    }

    // The errors in the order of the fields (FORM first), server names
    // merged: ErrorSummary focuses the first invalid field on the page.
    const ordered = createMemo((): FormErrors => {
        const all = errors();
        const out: FormErrors = {};
        if (all[FORM]) out[FORM] = all[FORM];
        for (const name of names) {
            const found = errorsOf(name);
            if (found) out[name] = found;
        }
        for (const [key, items] of Object.entries(all)) {
            if (!(key in out) && !(key in aliases)) out[key] = items;
        }
        return out;
    });

    /** The props of the form's ErrorSummary. */
    const summary = {
        get errors() {
            return ordered();
        },
        inputId: (field: string) => id(aliases[field] ?? field),
    };

    /** A field differs from the saved value. */
    const dirty = () => names.some((name) => !same(values[name], base()[name]));

    /** Only the fields that differ from the saved value. */
    function changed(): Partial<V> {
        const out: Partial<V> = {};
        for (const name of names) {
            if (!same(values[name], base()[name])) out[name] = values[name];
        }
        return out;
    }

    /** Each text field has a text. */
    const filled = () =>
        names.every((name) => {
            const value = values[name];
            return typeof value !== 'string' || value.trim() !== '';
        });

    /** Back to the saved values, with no errors and no "done". */
    function reset() {
        batch(() => {
            setValues(copyAll(untrack(base)));
            setErrors({});
            setDone(false);
        });
    }

    function toErrors(found: CheckResult<V>): FormErrors {
        const out: FormErrors = {};
        for (const [field, message] of Object.entries(found)) {
            if (typeof message === 'string' && message)
                out[field] = [{ code: 'check', message, field }];
        }
        return out;
    }

    /**
     * The form's submit handler. It does nothing while the form is busy or
     * locked. Then `check`: its messages show as the server's do, and
     * nothing goes out. Else `send` gets a copy of the values; when it
     * answers true (run's success), done() is true until the next edit.
     */
    function onSubmit(send: (values: V) => Promise<boolean> | boolean) {
        return (e?: Event) => {
            e?.preventDefault();
            if (disabled()) return;
            const snapshot = copyAll(unwrap(values));
            setDone(false);
            const found = options.check?.(snapshot);
            if (found) {
                const failed = toErrors(found);
                if (Object.keys(failed).length > 0) {
                    setErrors(failed);
                    return;
                }
            }
            const seen = version;
            void (async () => {
                if (!(await send(snapshot))) return;
                batch(() => {
                    // The save put the saved value in the cache: show it.
                    if (version !== seen) setValues(copyAll(untrack(base)));
                    setDone(true);
                });
            })();
        };
    }

    return {
        values: values as Readonly<V>,
        set,
        id,
        errorsOf,
        input,
        control,
        toggle,
        summary,
        dirty,
        changed,
        filled,
        reset,
        done,
        onSubmit,
        busy,
        errors,
        setErrors,
        mutation: submit.mutation,
    };
}

/** What createForm gives, for a part of a form in another component. */
export type Form<V extends FormValues> = ReturnType<typeof createForm<V>>;
