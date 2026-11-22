// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@solidjs/testing-library';
import { useQuery } from '@tanstack/solid-query';
import { pageSection } from '@shared/nav/page-section';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { expectNoA11yViolations } from '@shared/testing/axe';
import { sessionClient } from '@shared/api/session-provider';
import { packageContentQuery, packageKeys } from './api/packages';
import { pkg, workflow } from './fixtures';
import MyPackagePage from './MyPackagePage';

const PATTERN = '/packages/:id/:section?';

const caller = workflow({
    id: 'w1',
    key: 'k1',
    name: 'main',
    program: {
        blocks: [
            { id: 1, type: 'ManualTrigger', params: {} },
            { id: 2, type: 'ExecuteWorkflow', params: { workflow: 'k2' } },
        ],
        connections: [{ from: 1, to: 2 }],
    },
    webhooks: [],
});
const called = workflow({
    id: 'w2',
    key: 'k2',
    name: 'helper',
    program: { blocks: [{ id: 1, type: 'ManualTrigger', params: {} }] },
    webhooks: [],
});
const summary = (w: ReturnType<typeof workflow>) => {
    const {
        program: _program,
        webhooks: _webhooks,
        schedules: _schedules,
        ...rest
    } = w;
    return rest;
};

const routes = (
    over: Record<string, (r: Request) => Response | Promise<Response>> = {}
) => ({
    ...signedIn,
    'GET /api/v1/workflow-packages/p1': () =>
        json(200, pkg({ access: 'Owner', latestVersion: 0, workflows: 2 })),
    'GET /api/v1/workflows': () =>
        json(200, [summary(caller), summary(called)]),
    'GET /api/v1/workflows/w1': () => json(200, caller),
    'GET /api/v1/workflows/w2': () => json(200, called),
    ...over,
});

describe('MyPackagePage', () => {
    it('lists its workflows and gives the navigation its group', async () => {
        fakeApi(routes());
        renderPage(() => <MyPackagePage />, '/packages/p1/workflows', PATTERN);

        expect(
            (await screen.findByRole('link', { name: 'main' })).getAttribute(
                'href'
            )
        ).toBe('/packages/p1/workflows/w1');
        await waitFor(() =>
            expect(pageSection()?.sections[0].label).toBe('Guild tools')
        );
        expect(pageSection()?.after).toBe('/packages');
        expect(pageSection()?.sections[0].items?.map((i) => i.href)).toEqual([
            '/packages/p1/workflows',
            '/packages/p1/runs',
            '/packages/p1/settings',
        ]);
    });

    it('turns a workflow on: fetches it, then saves it over the version it read', async () => {
        const api = fakeApi(
            routes({
                'PUT /api/v1/workflows/w1': () =>
                    json(200, { ...caller, active: true }),
            })
        );
        renderPage(() => <MyPackagePage />, '/packages/p1/workflows', PATTERN);

        fireEvent.click((await screen.findAllByRole('switch'))[0]);

        await waitFor(() =>
            expect(api.calls('PUT /api/v1/workflows/w1')).toHaveLength(1)
        );
        expect(
            await api.calls('PUT /api/v1/workflows/w1')[0].json()
        ).toMatchObject({ active: true, version: 3 });
    });

    it('chooses the error workflow, keeping the rest of the package as it is', async () => {
        const api = fakeApi(
            routes({
                'GET /api/v1/workflow-packages/p1/shares': () => json(200, []),
                'PUT /api/v1/workflow-packages/p1': () =>
                    json(200, pkg({ access: 'Owner', errorWorkflow: 'k2' })),
            })
        );
        renderPage(() => <MyPackagePage />, '/packages/p1/settings', PATTERN);

        const select =
            await screen.findByLabelText<HTMLSelectElement>('When a run fails');
        await waitFor(() => expect(select.options).toHaveLength(3));
        fireEvent.change(select, { target: { value: 'k2' } });
        fireEvent.click(
            within(select.closest('form') as HTMLElement).getByRole('button', {
                name: 'Save',
            })
        );

        await waitFor(() =>
            expect(api.calls('PUT /api/v1/workflow-packages/p1')).toHaveLength(
                1
            )
        );
        expect(
            await api.calls('PUT /api/v1/workflow-packages/p1')[0].json()
        ).toMatchObject({
            name: 'Guild tools',
            visibility: 'Public',
            errorWorkflow: 'k2',
            expectedStamp: 's1',
        });
    });

    it('will not publish a workflow without the one it calls', async () => {
        const api = fakeApi(
            routes({
                'GET /api/v1/workflow-packages/p1/shares': () => json(200, []),
                'POST /api/v1/workflow-packages/p1/versions': () =>
                    json(201, {
                        version: 1,
                        changelog: '',
                        contentHash: 'h',
                        createdAt: '2026-10-26T10:00:00Z',
                    }),
            })
        );
        renderPage(() => <MyPackagePage />, '/packages/p1/settings', PATTERN);

        const open = await screen.findByRole('button', { name: 'New version' });
        await waitFor(() => expect(open).toHaveProperty('disabled', false));
        fireEvent.click(open);
        fireEvent.click(await screen.findByLabelText(/helper/));

        expect(
            await screen.findByText('“main” calls “helper”: choose it too.')
        ).toBeTruthy();
        const publish = screen.getByRole('button', { name: 'Publish' });
        expect(publish).toHaveProperty('disabled', true);

        fireEvent.click(screen.getByLabelText(/helper/));
        await waitFor(() => expect(publish).toHaveProperty('disabled', false));
        fireEvent.click(publish);
        await waitFor(() =>
            expect(
                api.calls('POST /api/v1/workflow-packages/p1/versions')
            ).toHaveLength(1)
        );
        expect(
            await api
                .calls('POST /api/v1/workflow-packages/p1/versions')[0]
                .json()
        ).toMatchObject({ workflows: ['w1', 'w2'] });
    });

    it('adds tags as capsules and changes who sees it, each saved on its own', async () => {
        const api = fakeApi(
            routes({
                'GET /api/v1/workflow-packages/p1/shares': () => json(200, []),
                'PUT /api/v1/workflow-packages/p1': () =>
                    json(200, pkg({ access: 'Owner' })),
            })
        );
        renderPage(() => <MyPackagePage />, '/packages/p1/settings', PATTERN);

        const input = await screen.findByLabelText('Tags');
        fireEvent.input(input, { target: { value: 'Raid Bot' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(screen.getByText('raid-bot')).toBeTruthy();
        fireEvent.click(
            within(input.closest('form') as HTMLElement).getByRole('button', {
                name: 'Save',
            })
        );
        await waitFor(() =>
            expect(api.calls('PUT /api/v1/workflow-packages/p1')).toHaveLength(
                1
            )
        );
        expect(
            await api.calls('PUT /api/v1/workflow-packages/p1')[0].json()
        ).toMatchObject({
            tags: ['discord-bot', 'raid-bot'],
            visibility: 'Public',
        });

        fireEvent.click(screen.getByLabelText(/^Private/));
        const visibility = screen
            .getByLabelText(/^Private/)
            .closest('form') as HTMLElement;
        fireEvent.click(
            within(visibility).getByRole('button', { name: 'Save' })
        );
        await waitFor(() =>
            expect(api.calls('PUT /api/v1/workflow-packages/p1')).toHaveLength(
                2
            )
        );
        expect(
            await api.calls('PUT /api/v1/workflow-packages/p1')[1].json()
        ).toMatchObject({ tags: ['discord-bot'], visibility: 'Private' });
    });

    it('keeps an unsaved choice in one card when another card saves', async () => {
        // The server keeps what it is sent: each save is a new package.
        let saved = pkg({ access: 'Owner', latestVersion: 0, workflows: 2 });
        const api = fakeApi(
            routes({
                'GET /api/v1/workflow-packages/p1': () => json(200, saved),
                'GET /api/v1/workflow-packages/p1/shares': () => json(200, []),
                'PUT /api/v1/workflow-packages/p1': async (r) => {
                    const body = (await r.json()) as Record<string, unknown>;
                    saved = {
                        ...saved,
                        tags: body.tags as string[],
                        visibility: body.visibility as string,
                        errorWorkflow: (body.errorWorkflow ?? null) as null,
                        stamp: `${saved.stamp}+`,
                    };
                    return json(200, saved);
                },
            })
        );
        renderPage(() => <MyPackagePage />, '/packages/p1/settings', PATTERN);
        const card = (field: HTMLElement) =>
            within(field.closest('form') as HTMLElement);

        // Unsaved: a tag and the error workflow.
        const input = await screen.findByLabelText('Tags');
        fireEvent.input(input, { target: { value: 'raid' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        const select =
            await screen.findByLabelText<HTMLSelectElement>('When a run fails');
        await waitFor(() => expect(select.options).toHaveLength(3));
        fireEvent.change(select, { target: { value: 'k2' } });

        // Saved: who sees it.
        const priv = screen.getByLabelText<HTMLInputElement>(/^Private/);
        fireEvent.click(priv);
        fireEvent.click(card(priv).getByRole('button', { name: 'Save' }));
        await waitFor(() =>
            expect(api.calls('PUT /api/v1/workflow-packages/p1')).toHaveLength(
                1
            )
        );
        // The new package is in the cache: nothing left to save here.
        await waitFor(() =>
            expect(
                card(priv).getByRole('button', { name: 'Save' })
            ).toHaveProperty('disabled', true)
        );

        expect(screen.getByText('raid')).toBeTruthy();
        expect(select.value).toBe('k2');

        // Unsaved: who sees it; saved: the tags.
        const unlisted = screen.getByLabelText<HTMLInputElement>(/^Unlisted/);
        fireEvent.click(unlisted);
        fireEvent.click(card(input).getByRole('button', { name: 'Save' }));
        await waitFor(() =>
            expect(api.calls('PUT /api/v1/workflow-packages/p1')).toHaveLength(
                2
            )
        );
        expect(
            await api.calls('PUT /api/v1/workflow-packages/p1')[1].json()
        ).toMatchObject({
            tags: ['discord-bot', 'raid'],
            visibility: 'Private',
        });
        await waitFor(() =>
            expect(
                card(input).getByRole('button', { name: 'Save' })
            ).toHaveProperty('disabled', true)
        );
        expect(unlisted.checked).toBe(true);
        expect(select.value).toBe('k2');
    });

    it('shows a failed tags save: a field error under the input, the rest at the card top', async () => {
        let answer = () =>
            json(400, {
                code: 'TagInvalid',
                message: 'Too long.',
                field: 'tags',
            });
        fakeApi(
            routes({
                'GET /api/v1/workflow-packages/p1/shares': () => json(200, []),
                'PUT /api/v1/workflow-packages/p1': () => answer(),
            })
        );
        renderPage(() => <MyPackagePage />, '/packages/p1/settings', PATTERN);

        const input = await screen.findByLabelText('Tags');
        const save = within(input.closest('form') as HTMLElement).getByRole(
            'button',
            { name: 'Save' }
        );
        fireEvent.input(input, { target: { value: 'raid' } });
        fireEvent.click(save);
        await waitFor(() =>
            expect(input.getAttribute('aria-invalid')).toBe('true')
        );
        expect(
            document.getElementById(
                input.getAttribute('aria-describedby') ?? ''
            )?.textContent
        ).toBe('Too long.');

        answer = () =>
            json(409, {
                code: 'TestChanged',
                message: 'The package changed meanwhile.',
            });
        fireEvent.click(save);
        const alert = await within(
            input.closest('form') as HTMLElement
        ).findByRole('alert');
        expect(alert.textContent).toBe('The package changed meanwhile.');
        expect(document.activeElement).toBe(alert);
        expect(input.getAttribute('aria-invalid')).toBe('false');
        await expectNoA11yViolations();
    });

    it('shows a refused visibility under its choices', async () => {
        fakeApi(
            routes({
                'GET /api/v1/workflow-packages/p1/shares': () => json(200, []),
                'PUT /api/v1/workflow-packages/p1': () =>
                    json(400, {
                        code: 'VisibilityInvalid',
                        message: 'Not while it is installed.',
                        field: 'visibility',
                    }),
            })
        );
        renderPage(() => <MyPackagePage />, '/packages/p1/settings', PATTERN);

        await screen.findByLabelText('Tags');
        const priv = screen.getByLabelText(/^Private/);
        fireEvent.click(priv);
        fireEvent.click(
            within(priv.closest('form') as HTMLElement).getByRole('button', {
                name: 'Save',
            })
        );
        await waitFor(() =>
            expect(priv.getAttribute('aria-invalid')).toBe('true')
        );
        const group = screen.getByRole('group', { name: 'Who sees it' });
        expect(
            document.getElementById(
                group.getAttribute('aria-describedby') ?? ''
            )?.textContent
        ).toBe('Not while it is installed.');
        expect(document.activeElement).toBe(group);
        await expectNoA11yViolations();
    });

    it('shows a failed read of the package with a retry', async () => {
        fakeApi(
            routes({
                'GET /api/v1/workflow-packages/p1': () =>
                    json(500, { code: 'TestBroken', message: 'Try later.' }),
            })
        );
        renderPage(() => <MyPackagePage />, '/packages/p1/workflows', PATTERN);

        expect((await screen.findByRole('alert')).textContent).toBe(
            'Try later.'
        );
        expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
        expect(screen.queryByText(/does not exist/)).toBeNull();
    });

    it('a publish asks the latest content again, not a published version’s', async () => {
        const content = (version: number) => ({
            version,
            changelog: '',
            contentHash: 'h',
            createdAt: '2026-10-26T10:00:00Z',
            workflows: [],
            connections: [],
        });
        const api = fakeApi(
            routes({
                'GET /api/v1/workflow-packages/p1/shares': () => json(200, []),
                'GET /api/v1/workflow-packages/p1/content': (r) =>
                    json(
                        200,
                        content(
                            Number(
                                new URL(r.url).searchParams.get('version') ?? 2
                            )
                        )
                    ),
                'POST /api/v1/workflow-packages/p1/versions': () =>
                    json(201, {
                        version: 2,
                        changelog: '',
                        contentHash: 'h',
                        createdAt: '2026-10-26T10:00:00Z',
                    }),
            })
        );
        const contentCalls = (version: string | null) =>
            api
                .calls('GET /api/v1/workflow-packages/p1/content')
                .filter(
                    (r) =>
                        new URL(r.url).searchParams.get('version') === version
                );
        // Something on the page reads version 1 and the latest.
        renderPage(
            () => {
                useQuery(() => packageContentQuery('p1', 1));
                useQuery(() => packageContentQuery('p1'));
                return <MyPackagePage />;
            },
            '/packages/p1/settings',
            PATTERN
        );
        await waitFor(() => expect(contentCalls(null)).toHaveLength(1));
        expect(contentCalls('1')).toHaveLength(1);

        const open = await screen.findByRole('button', { name: 'New version' });
        await waitFor(() => expect(open).toHaveProperty('disabled', false));
        fireEvent.click(open);
        const publish = screen.getByRole('button', { name: 'Publish' });
        await waitFor(() => expect(publish).toHaveProperty('disabled', false));
        fireEvent.click(publish);

        await waitFor(() => expect(contentCalls(null)).toHaveLength(2));
        expect(contentCalls('1')).toHaveLength(1);
    });

    it('says nothing changed when a publish conflicts with the latest version', async () => {
        fakeApi(
            routes({
                'GET /api/v1/workflow-packages/p1/shares': () => json(200, []),
                'POST /api/v1/workflow-packages/p1/versions': () =>
                    json(409, {
                        code: 'Conflict',
                        message: 'Same as the latest version.',
                    }),
            })
        );
        renderPage(() => <MyPackagePage />, '/packages/p1/settings', PATTERN);

        const open = await screen.findByRole('button', { name: 'New version' });
        await waitFor(() => expect(open).toHaveProperty('disabled', false));
        fireEvent.click(open);
        const publish = screen.getByRole('button', { name: 'Publish' });
        await waitFor(() => expect(publish).toHaveProperty('disabled', false));
        fireEvent.click(publish);

        expect(
            await screen.findByText(/Nothing changed since the latest version/)
        ).toBeTruthy();
        expect(screen.queryByText('Same as the latest version.')).toBeNull();
        // The dialog stays open.
        expect(screen.getByRole('button', { name: 'Publish' })).toBeTruthy();
    });

    it('deletes the package after asking, drops it from the cache and goes to the list', async () => {
        const api = fakeApi(
            routes({
                'GET /api/v1/workflow-packages/p1/shares': () => json(200, []),
                'GET /api/v1/workflow-packages': () => json(200, []),
                'DELETE /api/v1/workflow-packages/p1': () =>
                    new Response(null, { status: 204 }),
            })
        );
        const { history } = renderPage(
            () => <MyPackagePage />,
            '/packages/p1/settings',
            PATTERN
        );

        fireEvent.click(
            await screen.findByRole('button', { name: 'Delete this package' })
        );
        fireEvent.click(
            within(await screen.findByRole('alertdialog')).getByRole('button', {
                name: 'Delete',
            })
        );

        await waitFor(() => expect(history.get()).toBe('/packages'));
        expect(api.calls('DELETE /api/v1/workflow-packages/p1')).toHaveLength(
            1
        );
        expect(
            sessionClient().getQueryState(packageKeys.workflows('p1'))
        ).toBeUndefined();
    });
});
