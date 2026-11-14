import { createRoot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import type { ApiResult } from './client';
import { FORM } from './errors';
import { createSubmit } from './submit';

const inRoot = <T>(make: () => T): T =>
    createRoot((dispose) => {
        const value = make();
        dispose();
        return value;
    });

const answer = <T>(result: ApiResult<T>) => Promise.resolve(result);

describe('createSubmit', () => {
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
        const later = <T>() => {
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
