// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { Route } from '@solidjs/router';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage, renderRoutes } from '@shared/testing/render-page';
import { pkg } from '@features/packages/fixtures';
import { usePackage } from '@features/packages/package-nav';
import PackagePage from '@features/packages/PackagePage';
import PackageDetails from './PackageDetails';

const content = {
    version: 2,
    changelog: 'Louder.',
    contentHash: 'h',
    createdAt: '2026-10-25T10:00:00Z',
    workflows: [
        {
            key: 'k1',
            name: 'main',
            main: true,
            contentHash: 'a',
            program: { blocks: [{}, {}, {}] },
        },
        {
            key: 'k2',
            name: 'on error',
            main: false,
            contentHash: 'b',
            program: { blocks: [{}] },
        },
    ],
    connections: [{ name: 'bot', provider: 'discord' }],
};

const routes = (over: Record<string, () => Response> = {}) => ({
    ...signedIn,
    'GET /api/v1/workflow-packages/p1': () => json(200, pkg()),
    'GET /api/v1/workflow-packages/p1/content': () => json(200, content),
    'GET /api/v1/workflow-packages/p1/versions': () =>
        json(200, [
            {
                version: 2,
                changelog: 'Louder.',
                contentHash: 'h',
                createdAt: '2026-10-25T10:00:00Z',
            },
            {
                version: 1,
                changelog: '',
                contentHash: 'g',
                createdAt: '2026-10-24T10:00:00Z',
            },
        ]),
    ...over,
});

describe('PackageDetails', () => {
    afterEach(() => {
        sessionStorage.clear();
    });

    it('shows the README, the workflows of the latest version and the versions', async () => {
        fakeApi(routes());

        renderPage(() => <PackageDetails id="p1" />);

        // The page's title, and the README's own.
        expect(
            await screen.findAllByRole('heading', { name: /^Guild tools/ })
        ).toHaveLength(2);
        expect(await screen.findByText('3 blocks')).toBeTruthy();
        expect(screen.getByText('on error')).toBeTruthy();
        expect(screen.getByText('v2')).toBeTruthy();
        expect(screen.getByText('Louder.')).toBeTruthy();
        // Who sees it, beside the title.
        expect(screen.getByText('Public')).toBeTruthy();
        // A reader neither edits nor deletes.
        expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    });

    it('installs with the caller’s connection of the same name picked to start with', async () => {
        const api = fakeApi(
            routes({
                'GET /api/v1/connections': () =>
                    json(200, [
                        {
                            id: 'c1',
                            provider: 'discord',
                            name: 'bot',
                            authType: 'Manual',
                            status: 'Active',
                        },
                        {
                            id: 'c2',
                            provider: 'twitch',
                            name: 'bot',
                            authType: 'Manual',
                            status: 'Active',
                        },
                    ]),
                'POST /api/v1/workflow-packages/p1/install': () =>
                    json(201, {
                        package: pkg({ id: 'n0', access: 'Owner' }),
                        workflows: [{ id: 'n1', name: 'main', key: 'k1' }],
                        version: 2,
                        missingConnections: [],
                    }),
            })
        );

        renderPage(() => <PackageDetails id="p1" />);
        const install = await screen.findByRole('button', { name: 'Install' });
        await waitFor(() => expect(install).toHaveProperty('disabled', false));
        fireEvent.click(install);
        const select = await screen.findByLabelText<HTMLSelectElement>(/bot/);
        // Only connections of the provider it needs.
        await waitFor(() => expect(select.options).toHaveLength(2));
        expect(select.value).toBe('bot');
        fireEvent.click(screen.getAllByRole('button', { name: 'Install' })[1]);

        expect(await screen.findByText(/Installed/)).toBeTruthy();
        expect(
            screen.getByRole('link', { name: 'Open it' }).getAttribute('href')
        ).toBe('/packages/n0/workflows');
        const body = (await api
            .calls('POST /api/v1/workflow-packages/p1/install')[0]
            .json()) as {
            version: number;
            connections: Record<string, string>;
        };
        expect(body).toEqual({ version: 2, connections: { bot: 'bot' } });
    });

    it('sends its owner to manage it in their packages', async () => {
        fakeApi(
            routes({
                'GET /api/v1/workflow-packages/p1': () =>
                    json(200, pkg({ access: 'Owner' })),
            })
        );

        renderPage(() => <PackageDetails id="p1" />);

        expect(
            (
                await screen.findByRole('link', {
                    name: 'Manage it in your packages',
                })
            ).getAttribute('href')
        ).toBe('/packages/p1/settings');
        expect(
            screen.queryByRole('button', { name: 'New version' })
        ).toBeNull();
    });

    it('shares one request for the package with usePackage', async () => {
        const api = fakeApi(routes());

        renderPage(() => {
            usePackage(() => 'p1');
            return <PackageDetails id="p1" />;
        });

        expect(
            await screen.findAllByRole('heading', { name: /^Guild tools/ })
        ).toHaveLength(2);
        expect(api.calls('GET /api/v1/workflow-packages/p1')).toHaveLength(1);
    });

    it('shows a failed read with a retry, not “not found”', async () => {
        let broken = true;
        fakeApi(
            routes({
                'GET /api/v1/workflow-packages/p1': () =>
                    broken
                        ? json(500, {
                              code: 'TestBroken',
                              message: 'Try later.',
                          })
                        : json(200, pkg()),
            })
        );

        renderPage(() => <PackageDetails id="p1" />);

        expect((await screen.findByRole('alert')).textContent).toBe(
            'Try later.'
        );
        expect(screen.queryByText(/does not exist/)).toBeNull();

        broken = false;
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(
            await screen.findAllByRole('heading', { name: /^Guild tools/ })
        ).toHaveLength(2);
    });

    it('says a package it cannot find does not exist', async () => {
        fakeApi(
            routes({
                'GET /api/v1/workflow-packages/p1': () =>
                    json(404, { code: 'NotFound', message: 'Not found.' }),
            })
        );

        renderPage(() => <PackageDetails id="p1" />);

        expect(await screen.findByText(/does not exist/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    });

    it('moves to another package without showing the first one meanwhile', async () => {
        let answer: (r: Response) => void = () => {};
        fakeApi({
            ...routes(),
            'GET /api/v1/workflow-packages/p2': () =>
                new Promise<Response>((resolve) => (answer = resolve)),
            'GET /api/v1/workflow-packages/p2/content': () =>
                json(404, { code: 'NotFound', message: 'No version yet.' }),
            'GET /api/v1/workflow-packages/p2/versions': () => json(200, []),
        });
        const { history } = renderRoutes(
            () => <Route path="/explore/:id" component={PackagePage} />,
            '/explore/p1'
        );
        expect(
            await screen.findAllByRole('heading', { name: /^Guild tools/ })
        ).toHaveLength(2);

        history.set({ value: '/explore/p2' });

        await waitFor(() => expect(screen.queryByText('Louder.')).toBeNull());
        expect(
            screen.queryByRole('heading', { name: /^Guild tools/ })
        ).toBeNull();

        answer(json(200, pkg({ id: 'p2', name: 'Raid tools', readme: '' })));
        expect(
            await screen.findByRole('heading', { name: /^Raid tools/ })
        ).toBeTruthy();
        expect(screen.queryByText('3 blocks')).toBeNull();
    });

    it('picks nothing for a connection the caller lacks, and installs without it', async () => {
        const api = fakeApi(
            routes({
                // Only a connection of another provider.
                'GET /api/v1/connections': () =>
                    json(200, [
                        {
                            id: 'c2',
                            provider: 'twitch',
                            name: 'bot',
                            authType: 'Manual',
                            status: 'Active',
                        },
                    ]),
                'POST /api/v1/workflow-packages/p1/install': () =>
                    json(201, {
                        package: pkg({ id: 'n0', access: 'Owner' }),
                        workflows: [{ id: 'n1', name: 'main', key: 'k1' }],
                        version: 2,
                        missingConnections: ['bot'],
                    }),
            })
        );
        renderPage(() => <PackageDetails id="p1" />);
        const install = await screen.findByRole('button', { name: 'Install' });
        await waitFor(() => expect(install).toHaveProperty('disabled', false));
        fireEvent.click(install);
        const select = await screen.findByLabelText<HTMLSelectElement>(/bot/);
        expect(select.value).toBe('');

        fireEvent.click(screen.getAllByRole('button', { name: 'Install' })[1]);
        expect(await screen.findByText(/Installed/)).toBeTruthy();
        const body = (await api
            .calls('POST /api/v1/workflow-packages/p1/install')[0]
            .json()) as { connections: Record<string, string> };
        expect(body.connections).toEqual({});
    });
});
