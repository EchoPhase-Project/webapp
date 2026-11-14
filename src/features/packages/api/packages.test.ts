// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { QueryKey } from '@tanstack/solid-query';
import { sessionClient } from '@shared/api/session-provider';
import { createSubmit } from '@shared/api/submit';
import type { WorkflowPackage } from '@shared/api/types';
import { fakeApi, json } from '@shared/testing/fake-api';
import { withSession } from '@shared/testing/render-page';
import { pkg } from '@features/packages/fixtures';
import {
    createPackageMutation,
    deletePackageMutation,
    installPackageMutation,
    leavePackageMutation,
    packageKeys,
    publishPackageVersionMutation,
    updatePackageMutation,
} from './packages';

// The invalidation table (plan §5.9), one row of packages each: what a
// mutation leaves in the session's cache, whoever calls it.

const mine = pkg({ access: 'Owner' }) as unknown as WorkflowPackage;

/** Everything about the package `id` and the lists, as pages read them. */
function seed(id = 'p1') {
    const client = sessionClient();
    client.setQueryData(packageKeys.mine(), [mine]);
    client.setQueryData(packageKeys.explore('', ''), { pages: [] });
    client.setQueryData(packageKeys.explore('bot', ''), { pages: [] });
    client.setQueryData(packageKeys.detail(id), { ...mine, id });
    client.setQueryData(packageKeys.content(id), { version: 2 });
    client.setQueryData(packageKeys.content(id, 1), { version: 1 });
    client.setQueryData(packageKeys.versions(id), []);
    client.setQueryData(packageKeys.shares(id), []);
    client.setQueryData(packageKeys.workflows(id), []);
    return client;
}

const invalidated = (key: QueryKey) =>
    sessionClient().getQueryState(key)?.isInvalidated;
const cached = (key: QueryKey) =>
    sessionClient().getQueryState(key) !== undefined;

/** All the keys under the package `id`. */
const nested = (id: string) => [
    packageKeys.detail(id),
    packageKeys.content(id),
    packageKeys.content(id, 1),
    packageKeys.versions(id),
    packageKeys.shares(id),
    packageKeys.workflows(id),
];

describe('package mutations', () => {
    it('create: keeps the new package as answered and asks the caller’s list again', async () => {
        const created = pkg({
            id: 'p9',
            access: 'Owner',
            visibility: 'Private',
        });
        fakeApi({ 'POST /api/v1/workflow-packages': () => json(201, created) });
        const create = withSession(() =>
            createSubmit().mutation(createPackageMutation)
        );
        seed();

        expect(
            await create.run({
                name: 'New',
                summary: '',
                readme: '',
                visibility: 'Private',
            })
        ).toBe(true);

        expect(sessionClient().getQueryData(packageKeys.detail('p9'))).toEqual(
            created
        );
        expect(invalidated(packageKeys.mine())).toBe(true);
        expect(invalidated(packageKeys.explore('', ''))).toBe(false);
    });

    it('update: sends the rest as opened, keeps the answer, asks the caller’s list again; Explore stays', async () => {
        const saved = { ...mine, tags: ['raid'], stamp: 's2' };
        const api = fakeApi({
            'PUT /api/v1/workflow-packages/p1': () => json(200, saved),
        });
        const update = withSession(() =>
            createSubmit().mutation(updatePackageMutation)
        );
        seed();

        await update.run({ pkg: mine, patch: { tags: ['raid'] } });

        expect(
            await api.calls('PUT /api/v1/workflow-packages/p1')[0].json()
        ).toMatchObject({
            name: 'Guild tools',
            visibility: 'Public',
            tags: ['raid'],
            expectedStamp: 's1',
        });
        expect(sessionClient().getQueryData(packageKeys.detail('p1'))).toEqual(
            saved
        );
        expect(invalidated(packageKeys.mine())).toBe(true);
        expect(invalidated(packageKeys.explore('', ''))).toBe(false);
        // Nothing under it is asked again: only the record itself is set.
        expect(invalidated(packageKeys.content('p1'))).toBe(false);
        expect(invalidated(packageKeys.workflows('p1'))).toBe(false);
    });

    it('update of who sees it: asks all of Explore’s searches again', async () => {
        fakeApi({
            'PUT /api/v1/workflow-packages/p1': () =>
                json(200, { ...mine, visibility: 'Private' }),
        });
        const update = withSession(() =>
            createSubmit().mutation(updatePackageMutation)
        );
        seed();

        await update.run({ pkg: mine, patch: { visibility: 'Private' } });

        expect(invalidated(packageKeys.explore('', ''))).toBe(true);
        expect(invalidated(packageKeys.explore('bot', ''))).toBe(true);
    });

    it('update from two callers leaves the cache the same', async () => {
        const saved = { ...mine, stamp: 's2' };
        fakeApi({
            'PUT /api/v1/workflow-packages/p1': () => json(200, saved),
        });
        // Two forms of one page (tags, error workflow), each its own submit.
        const [tags, errorWorkflow] = withSession(() => [
            createSubmit(['tags']).mutation(updatePackageMutation),
            createSubmit(['errorWorkflow']).mutation(updatePackageMutation),
        ]);

        for (const caller of [tags, errorWorkflow]) {
            const client = seed();
            client.setQueryData(packageKeys.detail('p1'), mine);
            await caller.run({ pkg: mine, patch: {} });
            expect(client.getQueryData(packageKeys.detail('p1'))).toEqual(
                saved
            );
            expect(invalidated(packageKeys.mine())).toBe(true);
            client.clear();
        }
    });

    it('delete: drops all about the package, asks the caller’s list again', async () => {
        fakeApi({
            'DELETE /api/v1/workflow-packages/p1': () =>
                new Response(null, { status: 204 }),
        });
        const remove = withSession(() =>
            createSubmit().mutation(deletePackageMutation)
        );
        seed();
        seed('p2');

        await remove.run('p1');

        for (const key of nested('p1'))
            expect(cached(key), String(key)).toBe(false);
        for (const key of nested('p2'))
            expect(cached(key), String(key)).toBe(true);
        expect(invalidated(packageKeys.mine())).toBe(true);
    });

    it('leave: drops all about the shared package, asks the caller’s list again', async () => {
        const api = fakeApi({
            'DELETE /api/v1/workflow-packages/p1/shares/u1': () =>
                new Response(null, { status: 204 }),
        });
        const leave = withSession(() =>
            createSubmit().mutation(leavePackageMutation)
        );
        seed();

        await leave.run({ id: 'p1', userId: 'u1' });

        expect(
            api.calls('DELETE /api/v1/workflow-packages/p1/shares/u1')
        ).toHaveLength(1);
        for (const key of nested('p1'))
            expect(cached(key), String(key)).toBe(false);
        expect(invalidated(packageKeys.mine())).toBe(true);
    });

    it('publish: shows the new version, asks the package, versions, latest content and Explore again; published content stays', async () => {
        fakeApi({
            'POST /api/v1/workflow-packages/p1/versions': () =>
                json(201, {
                    version: 3,
                    changelog: '',
                    contentHash: 'h',
                    createdAt: '2026-11-01T10:00:00Z',
                }),
        });
        const publish = withSession(() =>
            createSubmit().mutation(publishPackageVersionMutation)
        );
        seed();

        await publish.run({
            id: 'p1',
            body: { workflows: ['w1'], changelog: '' },
        });

        expect(
            sessionClient().getQueryData<WorkflowPackage>(
                packageKeys.detail('p1')
            )
        ).toMatchObject({
            latestVersion: 3,
            updatedAt: '2026-11-01T10:00:00Z',
        });
        expect(invalidated(packageKeys.detail('p1'))).toBe(true);
        expect(invalidated(packageKeys.versions('p1'))).toBe(true);
        expect(invalidated(packageKeys.content('p1'))).toBe(true);
        expect(invalidated(packageKeys.explore('', ''))).toBe(true);
        expect(invalidated(packageKeys.content('p1', 1))).toBe(false);
        expect(invalidated(packageKeys.shares('p1'))).toBe(false);
        expect(invalidated(packageKeys.workflows('p1'))).toBe(false);
    });

    it('install: keeps the new package, asks the caller’s list and the source (its installs) again', async () => {
        const installed = pkg({ id: 'p9', access: 'Owner' });
        const api = fakeApi({
            'POST /api/v1/workflow-packages/p1/install': () =>
                json(200, {
                    package: installed,
                    workflows: [],
                    version: 2,
                    missingConnections: [],
                }),
        });
        const install = withSession(() =>
            createSubmit().mutation(installPackageMutation)
        );
        seed();

        await install.run({ id: 'p1', version: 2, connections: { bot: 'c1' } });

        expect(
            await api
                .calls('POST /api/v1/workflow-packages/p1/install')[0]
                .json()
        ).toEqual({ version: 2, connections: { bot: 'c1' } });
        expect(sessionClient().getQueryData(packageKeys.detail('p9'))).toEqual(
            installed
        );
        expect(invalidated(packageKeys.mine())).toBe(true);
        expect(invalidated(packageKeys.detail('p1'))).toBe(true);
        expect(invalidated(packageKeys.content('p1'))).toBe(false);
        expect(invalidated(packageKeys.versions('p1'))).toBe(false);
    });

    it('a failure leaves the cache as it was', async () => {
        fakeApi({
            'PUT /api/v1/workflow-packages/p1': () =>
                json(409, { code: 'Conflict', message: 'Changed meanwhile.' }),
        });
        const update = withSession(() =>
            createSubmit().mutation(updatePackageMutation)
        );
        seed();

        expect(await update.run({ pkg: mine, patch: { tags: [] } })).toBe(
            false
        );
        expect(sessionClient().getQueryData(packageKeys.detail('p1'))).toEqual(
            mine
        );
        expect(invalidated(packageKeys.mine())).toBe(false);
    });
});
