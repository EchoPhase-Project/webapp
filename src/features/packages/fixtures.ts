// Test data for the packages feature, as the API answers. Only tests import
// this file, so it stays out of the bundle.

/** A package as GET /workflow-packages/{id} answers. */
export const pkg = (over: Record<string, unknown> = {}) => ({
    id: 'p1',
    name: 'Guild tools',
    summary: '',
    readme: '# Guild tools\n\nLists the **guilds** of a bot.',
    visibility: 'Public',
    tags: ['discord-bot'],
    latestVersion: 2,
    installs: 7,
    workflows: 0,
    errorWorkflow: null,
    source: null,
    access: 'Read',
    owner: { id: 'u2', userName: 'ann', name: 'Ann' },
    stamp: 's1',
    createdAt: '2026-10-25T10:00:00Z',
    updatedAt: '2026-10-25T10:00:00Z',
    ...over,
});

/** A workflow of a package, with a webhook trigger and one more block. */
export const workflow = (over: Record<string, unknown> = {}) => ({
    id: 'w1',
    packageId: 'p1',
    key: 'k1',
    name: 'Guild report',
    active: false,
    version: 3,
    contentHash: 'h',
    createdAt: '2026-10-25T10:00:00Z',
    updatedAt: '2026-10-25T10:00:00Z',
    program: {
        blocks: [
            {
                id: 1,
                type: 'WebhookTrigger',
                params: { secret: 'a-secret-of-sixteen' },
            },
            { id: 2, type: 'Print', name: 'say hi', params: {} },
        ],
        connections: [{ from: 1, to: 2, output: 'main' }],
        startIds: [],
        settings: {},
    },
    webhooks: [
        { blockId: 1, path: '/api/v1/hooks/w1/1', respond: 'Immediately' },
    ],
    schedules: [],
    ...over,
});
