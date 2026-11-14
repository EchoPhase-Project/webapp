// @vitest-environment jsdom
import { createEffect, createRoot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { mutationOptions, type QueryClient } from '@tanstack/solid-query';
import { withSession } from '@shared/testing/render-page';
import { ApiError } from './client';
import { FORM } from './errors';
import { sessionClient } from './session-provider';
import { createSubmit } from './submit';

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
    it('is busy while the mutation and onOk run, and hands the data on', async () => {
        let resolve: ((note: Note) => void) | undefined;
        const { submit, update } = withUpdate(
            () => new Promise<Note>((r) => (resolve = r))
        );
        const onOk = vi.fn(() => expect(submit.busy()).toBe(true));

        const done = update.run({ id: 'n1', title: 'x' }, onOk);
        expect(submit.busy()).toBe(true);
        await vi.waitFor(() => expect(resolve).toBeDefined()); // it is out
        resolve?.({ id: 'n1', title: 'Saved' });

        expect(await done).toBe(true);
        expect(onOk).toHaveBeenCalledWith({ id: 'n1', title: 'Saved' });
        expect(submit.busy()).toBe(false);
        expect(sessionClient().getMutationCache().getAll()).toHaveLength(1);
    });

    it('clears the errors on success', async () => {
        let fail = true;
        const { submit, update } = withUpdate((v) =>
            fail ? Promise.reject(refusal({ code: 'X' })) : Promise.resolve(v)
        );

        await update.run({ id: 'n1', title: 'x' });
        expect(submit.errors()[FORM]).toHaveLength(1);

        fail = false;
        await update.run({ id: 'n1', title: 'x' });
        expect(submit.errors()).toEqual({});
    });

    it('groups as usual when onFail returns nothing', async () => {
        const { submit, update } = withUpdate(() =>
            Promise.reject(refusal({ code: 'Conflict' }))
        );
        await update.run({ id: 'n1', title: 'x' }, undefined, () => undefined);
        expect(submit.errors()[FORM]?.[0]?.code).toBe('Conflict');
    });

    it('pending keeps the errors and only sets busy', async () => {
        const submit = withSession(() => createSubmit());
        submit.setErrors({ [FORM]: [{ code: 'X', message: 'x' }] });

        const value = await submit.pending(() => {
            expect(submit.busy()).toBe(true);
            return Promise.resolve(3);
        });

        expect(value).toBe(3);
        expect(submit.busy()).toBe(false);
        expect(submit.errors()[FORM]).toHaveLength(1);
    });

    it('runFor clears only its own errors on success', async () => {
        let fail = true;
        const { submit, update } = withUpdate((v) =>
            fail
                ? Promise.reject(refusal({ code: 'Conflict' }))
                : Promise.resolve(v)
        );

        await update.runFor('a', { id: 'a', title: 'A' });
        await update.runFor('b', { id: 'b', title: 'B' });
        expect(submit.errors('a')[FORM]).toHaveLength(1);
        expect(submit.errors()).toEqual({});

        fail = false;
        await update.runFor('a', { id: 'a', title: 'A' });
        expect(submit.errors('a')).toEqual({});
        expect(submit.errors('b')[FORM]).toHaveLength(1);
    });

    it('is no longer busy for a row after a mutation that throws', async () => {
        const { submit, update } = withUpdate(() =>
            Promise.reject(new Error('aborted'))
        );
        await expect(
            update.runFor('a', { id: 'a', title: 'A' })
        ).rejects.toThrow('aborted');
        expect(submit.busy('a')).toBe(false);
        expect(submit.busy()).toBe(false);
    });

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
