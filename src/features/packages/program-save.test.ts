// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'solid-js';
import type { Workflow } from '@shared/api/types';
import { fakeApi, json } from '@shared/testing/fake-api';
import { workflow } from '@features/packages/fixtures';
import { useProgramSave } from './program-save';

type Hook = Workflow['webhooks'][number];

describe('useProgramSave', () => {
    it('deletes a trigger from the program, hands on the saved workflow and closes the question', async () => {
        const w = workflow() as unknown as Workflow;
        const saved = { ...w, version: 4, webhooks: [] };
        const api = fakeApi({
            'PUT /api/v1/workflows/w1': () => json(200, saved),
        });
        const onChange = vi.fn();
        const program = createRoot(() =>
            useProgramSave<Hook>(() => w, onChange)
        );
        const hook = w.webhooks[0];
        program.setDeleting(hook);

        await program.remove(hook);

        const body = (await api
            .calls('PUT /api/v1/workflows/w1')[0]
            .json()) as {
            program: Workflow['program'];
            version: number;
        };
        expect(body.program.blocks.map((b) => b.id)).toEqual([2]);
        expect(body.version).toBe(3);
        expect(onChange).toHaveBeenCalledWith(saved);
        expect(program.deleting()).toBeNull();
        expect(program.busy()).toBe(false);
    });

    it('keeps the editor open and shows the errors when the save fails', async () => {
        const w = workflow() as unknown as Workflow;
        fakeApi({
            'PUT /api/v1/workflows/w1': () =>
                json(400, { code: 'Invalid', message: 'Bad program.' }),
        });
        const onChange = vi.fn();
        const program = createRoot(() =>
            useProgramSave<Hook, Hook | 'new'>(() => w, onChange)
        );
        program.setEditing('new');

        expect(await program.save(w.program)).toBe(false);
        expect(onChange).not.toHaveBeenCalled();
        expect(program.editing()).toBe('new');
        expect(Object.values(program.errors()).flat()).not.toHaveLength(0);
    });
});
