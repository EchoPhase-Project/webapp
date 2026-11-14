// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { QueryKey } from '@tanstack/solid-query';
import { sessionClient } from '@shared/api/session-provider';
import { createSubmit } from '@shared/api/submit';
import type { Workflow, WorkflowSummary } from '@shared/api/types';
import { fakeApi, json } from '@shared/testing/fake-api';
import { withSession } from '@shared/testing/render-page';
import { pkg, workflow } from '@features/packages/fixtures';
import { packageKeys } from './packages';
import {
    deleteWorkflowMutation,
    importWorkflowMutation,
    restoreWorkflowVersionMutation,
    switchWorkflowMutation,
    updateWorkflowMutation,
    workflowKeys,
} from './workflows';

// The invalidation table (plan §5.9), one row of workflows each: what a
// mutation leaves in the session's cache, whoever calls it.

const w1 = workflow() as unknown as Workflow;
const summary = (w: Workflow): WorkflowSummary => ({
    id: w.id,
    packageId: w.packageId,
    key: w.key,
    name: w.name,
    active: w.active,
    version: w.version,
    contentHash: w.contentHash,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
});
const w2 = workflow({ id: 'w2', key: 'k2' }) as unknown as Workflow;

/** The workflows, their versions, their package and its list, as pages read them. */
function seed() {
    const client = sessionClient();
    client.setQueryData(packageKeys.mine(), [pkg({ access: 'Owner' })]);
    client.setQueryData(packageKeys.detail('p1'), pkg({ access: 'Owner' }));
    client.setQueryData(packageKeys.workflows('p1'), [
        summary(w1),
        summary(w2),
    ]);
    for (const w of [w1, w2]) {
        client.setQueryData(workflowKeys.detail(w.id), w);
        client.setQueryData(workflowKeys.versions(w.id), []);
    }
    return client;
}

const invalidated = (key: QueryKey) =>
    sessionClient().getQueryState(key)?.isInvalidated;
const cached = (key: QueryKey) =>
    sessionClient().getQueryState(key) !== undefined;

/** What a save of w1 must leave: the answer kept, its row changed, the lists asked again. */
function expectSaved(saved: Workflow) {
    const client = sessionClient();
    expect(client.getQueryData(workflowKeys.detail('w1'))).toEqual(saved);
    expect(
        client.getQueryData<WorkflowSummary[]>(packageKeys.workflows('p1'))
    ).toEqual([summary(saved), summary(w2)]);
    expect(invalidated(workflowKeys.versions('w1'))).toBe(true);
    expect(invalidated(packageKeys.workflows('p1'))).toBe(true);
    // Nothing else: the other workflow, the package and its list.
    expect(invalidated(workflowKeys.detail('w2'))).toBe(false);
    expect(invalidated(workflowKeys.versions('w2'))).toBe(false);
    expect(invalidated(packageKeys.detail('p1'))).toBe(false);
    expect(invalidated(packageKeys.mine())).toBe(false);
}

describe('workflow mutations', () => {
    it('update (program, webhooks, schedules, switch): saves over the version shown and keeps the answer', async () => {
        const saved = { ...w1, version: 4, webhooks: [] };
        const api = fakeApi({
            'PUT /api/v1/workflows/w1': () => json(200, saved),
        });
        const update = withSession(() =>
            createSubmit().mutation(updateWorkflowMutation)
        );
        seed();

        await update.run({ workflow: w1, changes: { name: 'Renamed' } });

        expect(
            await api.calls('PUT /api/v1/workflows/w1')[0].json()
        ).toMatchObject({ name: 'Renamed', active: false, version: 3 });
        expectSaved(saved);
    });

    it('switch: reads the workflow anew, saves over that version, and leaves the cache as update does', async () => {
        const fresh = { ...w1, version: 5 };
        const saved = { ...w1, version: 6, active: true };
        const api = fakeApi({
            'GET /api/v1/workflows/w1': () => json(200, fresh),
            'PUT /api/v1/workflows/w1': () => json(200, saved),
        });
        const turn = withSession(() =>
            createSubmit().mutation(switchWorkflowMutation)
        );
        seed();

        await turn.runFor('w1', { id: 'w1', active: true });

        // Read anew though w1 was cached.
        expect(api.calls('GET /api/v1/workflows/w1')).toHaveLength(1);
        expect(
            await api.calls('PUT /api/v1/workflows/w1')[0].json()
        ).toMatchObject({ active: true, version: 5 });
        expectSaved(saved);
    });

    it('restore: keeps the restored workflow and asks its versions and its package’s list again', async () => {
        const saved = { ...w1, version: 4 };
        fakeApi({
            'POST /api/v1/workflows/w1/versions/2/restore': () =>
                json(200, saved),
        });
        const restore = withSession(() =>
            createSubmit().mutation(restoreWorkflowVersionMutation)
        );
        seed();

        await restore.run({ id: 'w1', version: 2, currentVersion: 3 });

        expectSaved(saved);
    });

    it('delete: drops the workflow and its versions, asks its package’s list and the caller’s packages again', async () => {
        fakeApi({
            'DELETE /api/v1/workflows/w1': () =>
                new Response(null, { status: 204 }),
        });
        const remove = withSession(() =>
            createSubmit().mutation(deleteWorkflowMutation)
        );
        seed();

        await remove.run({ id: 'w1', packageId: 'p1' });

        expect(cached(workflowKeys.detail('w1'))).toBe(false);
        expect(cached(workflowKeys.versions('w1'))).toBe(false);
        expect(cached(workflowKeys.detail('w2'))).toBe(true);
        expect(invalidated(packageKeys.workflows('p1'))).toBe(true);
        expect(invalidated(packageKeys.mine())).toBe(true);
    });

    it('import: keeps the new workflow, asks its package’s list and the caller’s packages again', async () => {
        const imported = { ...w1, id: 'w9' };
        const api = fakeApi({
            'POST /api/v1/workflows/import/file': () =>
                json(201, { workflow: imported, intact: true }),
        });
        const importing = withSession(() =>
            createSubmit().mutation(importWorkflowMutation)
        );
        seed();

        await importing.run({
            file: new File(['{}'], 'w.json', { type: 'application/json' }),
            packageId: 'p1',
        });

        expect(api.calls('POST /api/v1/workflows/import/file')).toHaveLength(1);
        expect(sessionClient().getQueryData(workflowKeys.detail('w9'))).toEqual(
            imported
        );
        expect(invalidated(packageKeys.workflows('p1'))).toBe(true);
        expect(invalidated(packageKeys.mine())).toBe(true);
        expect(invalidated(packageKeys.detail('p1'))).toBe(false);
    });
});
