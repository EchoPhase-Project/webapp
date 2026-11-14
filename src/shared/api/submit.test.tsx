// @vitest-environment jsdom
import { createEffect, createRoot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { mutationOptions, type QueryClient } from '@tanstack/solid-query';
import { withSession } from '@shared/testing/render-page';
import { ApiError, type ApiResult } from './client';
import { FORM } from './errors';
import { sessionClient } from './session-provider';
import { createSubmit } from './submit';

// Made as a component makes it: under the session's QueryClient.
const inRoot = withSession;

const answer = <T,>(result: ApiResult<T>) => Promise.resolve(result);

describe('createSubmit (transitional run)', () => {
    it('is busy while the call and onOk run, and hands the data on', async () => {
        const submit = inRoot(() => createSubmit());
        let resolve: (r: ApiResult<number>) => void = () => {};
        const call = new Promise<ApiResult<number>>((r) => (resolve = r));
        const onOk = vi.fn(() => expect(submit.busy()).toBe(true));

        const done = submit.run(() => call, onOk);
        expect(submit.busy()).toBe(true);
        resolve({ ok: true, data: 7 });

        expect(await done).toBe(true);
        expect(onOk).toHaveBeenCalledWith(7);
        expect(submit.busy()).toBe(false);
    });

    it('groups errors by its fields, and clears them on success', async () => {
        const submit = inRoot(() => createSubmit(['name']));
        const ok = await submit.run(() =>
            answer({
                ok: false,
                errors: [
                    { code: 'Taken', message: 'taken', field: 'name' },
                    { code: 'Other', message: 'other', field: 'colour' },
                ],
            })
        );

        expect(ok).toBe(false);
        expect(submit.errors().name?.[0]?.code).toBe('Taken');
        expect(submit.errors()[FORM]?.[0]?.code).toBe('Other');

        await submit.run(() => answer({ ok: true, data: null }));
        expect(submit.errors()).toEqual({});
    });

    it('shows a failure once no longer busy, so the inputs can take the focus', async () => {
        const submit = inRoot(() => createSubmit());
        const seen: boolean[] = [];
        createRoot(() =>
            createEffect(() => {
                if (Object.keys(submit.errors()).length > 0)
                    seen.push(submit.busy());
            })
        );
        await submit.run(() =>
            answer({ ok: false, errors: [{ code: 'X', message: 'x' }] })
        );
        expect(seen).toEqual([false]);
    });

    it('shows what onFail makes of a failure, when it returns something', async () => {
        const submit = inRoot(() => createSubmit());
        const failed: ApiResult<null> = {
            ok: false,
            errors: [{ code: 'Conflict', message: 'same' }],
        };
        const onOk = vi.fn();

        await submit.run(
            () => answer(failed),
            onOk,
            () => ({})
        );
        expect(submit.errors()).toEqual({});

        await submit.run(
            () => answer(failed),
            onOk,
            () => undefined
        );
        expect(submit.errors()[FORM]?.[0]?.code).toBe('Conflict');
        expect(onOk).not.toHaveBeenCalled();
    });

    it('is no longer busy after a call that throws', async () => {
        const submit = inRoot(() => createSubmit());
        await expect(
            submit.run(() => Promise.reject(new Error('aborted')))
        ).rejects.toThrow('aborted');
        expect(submit.busy()).toBe(false);
    });

    it('pending keeps the errors and only sets busy', async () => {
        const submit = inRoot(() => createSubmit());
        submit.setErrors({ [FORM]: [{ code: 'X', message: 'x' }] });

        const value = await submit.pending(() => {
            expect(submit.busy()).toBe(true);
            return Promise.resolve(3);
        });

        expect(value).toBe(3);
        expect(submit.busy()).toBe(false);
        expect(submit.errors()[FORM]).toHaveLength(1);
    });

    describe('runFor', () => {
        const later = <T,>() => {
            let resolve: (r: ApiResult<T>) => void = () => {};
            const promise = new Promise<ApiResult<T>>((r) => (resolve = r));
            return { promise, resolve };
        };

        it('is busy by key: one key that ends leaves the other busy', async () => {
            const submit = inRoot(() => createSubmit());
            const a = later<null>();
            const b = later<null>();

            const doneA = submit.runFor('a', () => a.promise);
            const doneB = submit.runFor('b', () => b.promise);
            expect(submit.busy('a')).toBe(true);
            expect(submit.busy('b')).toBe(true);
            expect(submit.busy()).toBe(true);

            a.resolve({ ok: true, data: null });
            expect(await doneA).toBe(true);
            expect(submit.busy('a')).toBe(false);
            expect(submit.busy('b')).toBe(true);
            expect(submit.busy()).toBe(true);

            b.resolve({ ok: true, data: null });
            await doneB;
            expect(submit.busy('b')).toBe(false);
            expect(submit.busy()).toBe(false);
        });

        it('keeps errors by key: a success of one does not clear the other', async () => {
            const submit = inRoot(() => createSubmit());
            await submit.runFor('a', () =>
                answer({
                    ok: false,
                    errors: [{ code: 'Conflict', message: 'changed' }],
                })
            );
            await submit.runFor('b', () => answer({ ok: true, data: 1 }));

            expect(submit.errors('a')[FORM]?.[0]?.code).toBe('Conflict');
            expect(submit.errors('b')).toEqual({});
            // Neither the form's own errors nor its busy flag.
            expect(submit.errors()).toEqual({});

            await submit.runFor('a', () => answer({ ok: true, data: 2 }));
            expect(submit.errors('a')).toEqual({});
        });

        it('is no longer busy for the key after a call that throws', async () => {
            const submit = inRoot(() => createSubmit());
            await expect(
                submit.runFor('a', () => Promise.reject(new Error('aborted')))
            ).rejects.toThrow('aborted');
            expect(submit.busy('a')).toBe(false);
            expect(submit.busy()).toBe(false);
        });
    });
});

describe('the transitional run', () => {
    it('takes data as well as an ApiResult', async () => {
        const submit = inRoot(() => createSubmit());
        const onOk = vi.fn();

        expect(
            await submit.run(() => Promise.resolve({ id: 'n1' }), onOk)
        ).toBe(true);
        expect(onOk).toHaveBeenLastCalledWith({ id: 'n1' });

        await submit.run(() => answer({ ok: true, data: 5 }), onOk);
        expect(onOk).toHaveBeenLastCalledWith(5);
    });

    it('groups an ApiError that the call throws itself', async () => {
        const submit = inRoot(() => createSubmit(['name']));
        const ok = await submit.run(() =>
            Promise.reject(
                new ApiError(
                    [{ code: 'Taken', message: 'taken', field: 'name' }],
                    409
                )
            )
        );
        expect(ok).toBe(false);
        expect(submit.errors().name?.[0]?.code).toBe('Taken');
    });

    it('goes through a mutation of the session', async () => {
        const submit = inRoot(() => createSubmit());
        await submit.run(() => answer({ ok: true, data: 1 }));
        expect(sessionClient().getMutationCache().getAll()).toHaveLength(1);
    });
});

type Note = { id: string; title: string };

const noteKeys = { detail: (id: string) => ['notes', id] as const };

/** A description as a feature's api.ts has it: the cache work in onSuccess. */
const updateNoteMutation =
    (save: (v: Note) => Promise<Note>, seen: string[] = []) =>
    (queryClient: QueryClient) =>
        mutationOptions({
            mutationKey: ['notes', 'update'] as const,
            mutationFn: save,
            onSuccess: (saved) => {
                seen.push('onSuccess');
                queryClient.setQueryData(noteKeys.detail(saved.id), saved);
            },
        });

/** A form's submit and its update of notes, made as a component makes them. */
const withUpdate = (
    save: (v: Note) => Promise<Note>,
    options: { fields?: readonly string[]; seen?: string[] } = {}
) =>
    withSession(() => {
        const submit = createSubmit(options.fields);
        return {
            submit,
            update: submit.mutation(updateNoteMutation(save, options.seen)),
        };
    });

const refusal = (...items: { code: string; field?: string }[]) =>
    new ApiError(
        items.map((item) => ({ message: item.code, ...item })),
        400
    );

describe('createSubmit.mutation', () => {
    it('groups an ApiError by the fields, the rest under FORM', async () => {
        const { submit, update } = withUpdate(
            () =>
                Promise.reject(
                    refusal(
                        { code: 'TooLong', field: 'title' },
                        { code: 'Other', field: 'colour' },
                        { code: 'Locked' }
                    )
                ),
            { fields: ['title'] }
        );

        expect(await update.run({ id: 'n1', title: 'x' })).toBe(false);
        expect(submit.errors().title?.map((e) => e.code)).toEqual(['TooLong']);
        expect(submit.errors()[FORM]?.map((e) => e.code)).toEqual([
            'Other',
            'Locked',
        ]);
    });

    it('lets onFail replace the grouping', async () => {
        const { submit, update } = withUpdate(
            () => Promise.reject(refusal({ code: 'Conflict', field: 'title' })),
            { fields: ['title'] }
        );
        const onOk = vi.fn();

        await update.run({ id: 'n1', title: 'x' }, onOk, (errors) => ({
            [FORM]: errors.map((e) => ({ ...e, code: 'Changed' })),
        }));

        expect(submit.errors().title).toBeUndefined();
        expect(submit.errors()[FORM]?.[0]?.code).toBe('Changed');
        expect(onOk).not.toHaveBeenCalled();
    });

    it('throws what is not an ApiError: a bug is not a form error', async () => {
        const { submit, update } = withUpdate(() =>
            Promise.reject(new TypeError('a bug'))
        );

        await expect(update.run({ id: 'n1', title: 'x' })).rejects.toThrow(
            'a bug'
        );
        expect(submit.errors()).toEqual({});
        expect(submit.busy()).toBe(false);

        await expect(
            submit.run(() => Promise.reject(new TypeError('another')))
        ).rejects.toThrow('another');
    });

    it("runs the description's onSuccess first, then onOk", async () => {
        const seen: string[] = [];
        const { update } = withUpdate((v) => Promise.resolve(v), { seen });

        const ok = await update.run({ id: 'n1', title: 'Saved' }, (saved) => {
            seen.push('onOk');
            expect(sessionClient().getQueryData(noteKeys.detail('n1'))).toEqual(
                saved
            );
        });

        expect(ok).toBe(true);
        expect(seen).toEqual(['onSuccess', 'onOk']);
    });

    it('updates the cache the same way from any caller, without onOk', async () => {
        const save = (v: Note) => Promise.resolve(v);
        // Two places that save the same entity: a form and a row action.
        const { form, row } = withSession(() => ({
            form: createSubmit().mutation(updateNoteMutation(save)),
            row: createSubmit().mutation(updateNoteMutation(save)),
        }));

        await form.run({ id: 'n1', title: 'From the form' });
        expect(sessionClient().getQueryData(noteKeys.detail('n1'))).toEqual({
            id: 'n1',
            title: 'From the form',
        });

        await row.runFor('n1', { id: 'n1', title: 'From the row' });
        expect(sessionClient().getQueryData(noteKeys.detail('n1'))).toEqual({
            id: 'n1',
            title: 'From the row',
        });
    });

    it('shows a failure once no longer busy, so the inputs can take the focus', async () => {
        const { submit, update } = withUpdate(() =>
            Promise.reject(refusal({ code: 'X' }))
        );
        const seen: boolean[] = [];
        createRoot(() =>
            createEffect(() => {
                if (Object.keys(submit.errors()).length > 0)
                    seen.push(submit.busy());
            })
        );

        await update.run({ id: 'n1', title: 'x' });
        expect(seen).toEqual([false]);
    });

    it('runFor keeps busy and errors for each row, for parallel calls', async () => {
        const answers = new Map<string, (fail: boolean) => void>();
        const { submit, update } = withUpdate(
            (v) =>
                new Promise<Note>((resolve, reject) =>
                    answers.set(v.id, (fail) =>
                        fail
                            ? reject(refusal({ code: 'Conflict' }))
                            : resolve(v)
                    )
                )
        );

        const a = update.runFor('a', { id: 'a', title: 'A' });
        const b = update.runFor('b', { id: 'b', title: 'B' });
        expect(submit.busy('a')).toBe(true);
        expect(submit.busy('b')).toBe(true);
        await vi.waitFor(() => expect(answers.size).toBe(2)); // both are out

        answers.get('a')?.(true);
        expect(await a).toBe(false);
        expect(submit.busy('a')).toBe(false);
        expect(submit.busy('b')).toBe(true);
        expect(submit.errors('a')[FORM]?.[0]?.code).toBe('Conflict');
        expect(submit.errors('b')).toEqual({});

        answers.get('b')?.(false);
        expect(await b).toBe(true);
        expect(submit.busy()).toBe(false);
        expect(submit.errors('a')[FORM]).toHaveLength(1);
        expect(submit.errors('b')).toEqual({});
        expect(submit.errors()).toEqual({});
    });
});
