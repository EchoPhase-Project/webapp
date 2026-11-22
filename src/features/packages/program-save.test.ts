// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { waitFor } from '@solidjs/testing-library';
import type { Workflow } from '@shared/api/types';
import { fakeApi, json } from '@shared/testing/fake-api';
import { sessionClient } from '@shared/api/session-provider';
import { withSession } from '@shared/testing/render-page';
import { workflowKeys } from '@features/packages/api/workflows';
import { workflow } from '@features/packages/fixtures';
import { useProgramSave } from './program-save';

type Hook = Workflow['webhooks'][number];

describe('useProgramSave', () => {
    it('deletes a trigger from the program, keeps the saved workflow and closes the question', async () => {
        const w = workflow() as unknown as Workflow;
        const saved = { ...w, version: 4, webhooks: [] };
        const api = fakeApi({
            'PUT /api/v1/workflows/w1': () => json(200, saved),
        });
        const program = withSession(() => useProgramSave<Hook>(() => w));
        const hook = w.webhooks[0];
        program.deletion.ask(hook);

        expect(await program.deletion.confirm(hook)).toBe(true);

        const body = (await api
            .calls('PUT /api/v1/workflows/w1')[0]
            .json()) as {
            program: Workflow['program'];
            version: number;
        };
        expect(body.program.blocks.map((b) => b.id)).toEqual([2]);
        expect(body.version).toBe(3);
        expect(sessionClient().getQueryData(workflowKeys.detail('w1'))).toEqual(
            saved
        );
        expect(program.deletion.item()).toBeNull();
        await waitFor(() => expect(program.deletion.busy()).toBe(false));
    });

    it('keeps the delete question open with the errors when the save fails', async () => {
        const w = workflow() as unknown as Workflow;
        fakeApi({
            'PUT /api/v1/workflows/w1': () =>
                json(409, { code: 'Conflict', message: 'Changed meanwhile.' }),
        });
        const program = withSession(() => useProgramSave<Hook>(() => w));
        const hook = w.webhooks[0];
        program.deletion.ask(hook);

        expect(await program.deletion.confirm(hook)).toBe(false);

        expect(program.deletion.item()).toBe(hook);
        expect(
            Object.values(program.deletion.errors()).flat()
        ).not.toHaveLength(0);
        expect(program.deletion.busy()).toBe(false);
        expect(
            sessionClient().getQueryData(workflowKeys.detail('w1'))
        ).toBeUndefined();
    });
});
