// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { sessionClient } from '@shared/api/session-provider';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { packageKeys } from './api/packages';
import { pkg } from './fixtures';
import PackagesPage from './PackagesPage';

describe('PackagesPage', () => {
    it('lists the caller’s packages, where they came from, and those shared with them', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/workflow-packages': () =>
                json(200, [
                    pkg({
                        id: 'p1',
                        name: 'Mine',
                        access: 'Owner',
                        workflows: 3,
                        latestVersion: 0,
                    }),
                    pkg({
                        id: 'p2',
                        name: 'Installed',
                        access: 'Owner',
                        workflows: 2,
                        latestVersion: 0,
                        source: { packageId: 'x', version: 4 },
                    }),
                    pkg({ id: 'p3', name: 'From Ann', access: 'Read' }),
                ]),
        });

        renderPage(() => <PackagesPage />);

        expect(
            (await screen.findByRole('link', { name: 'Mine' })).getAttribute(
                'href'
            )
        ).toBe('/packages/p1/workflows');
        expect(screen.getByText('3 workflows')).toBeTruthy();
        expect(
            screen
                .getByRole('link', { name: 'installed, v4' })
                .getAttribute('href')
        ).toBe('/explore/x');
        expect(
            screen.getByRole('link', { name: 'From Ann' }).getAttribute('href')
        ).toBe('/explore/p3');
    });

    it('offers Explore when there are none', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/workflow-packages': () => json(200, []),
        });

        renderPage(() => <PackagesPage />);

        expect(
            (
                await screen.findByRole('link', { name: 'Find one in Explore' })
            ).getAttribute('href')
        ).toBe('/explore');
    });

    it('shows a failed read with a retry, not “no packages”', async () => {
        let broken = true;
        fakeApi({
            ...signedIn,
            'GET /api/v1/workflow-packages': () =>
                broken
                    ? json(500, { code: 'TestBroken', message: 'Try later.' })
                    : json(200, [pkg({ name: 'Mine', access: 'Owner' })]),
        });

        renderPage(() => <PackagesPage />);

        expect((await screen.findByRole('alert')).textContent).toBe(
            'Try later.'
        );
        expect(screen.queryByText(/No packages yet/)).toBeNull();

        broken = false;
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(await screen.findByRole('link', { name: 'Mine' })).toBeTruthy();
    });

    it('shows what the server says about a new package’s name under that field', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/workflow-packages': () => json(200, []),
            'POST /api/v1/workflow-packages': () =>
                json(400, [
                    {
                        code: 'NameTaken',
                        message: 'You have a package of that name.',
                        field: 'name',
                    },
                ]),
        });
        renderPage(() => <PackagesPage />);

        fireEvent.click(
            await screen.findByRole('button', { name: 'New package' })
        );
        fireEvent.input(screen.getByLabelText('Name'), {
            target: { value: 'Guild tools' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));

        await waitFor(() =>
            expect(
                screen.getByLabelText('Name').getAttribute('aria-invalid')
            ).toBe('true')
        );
        expect(
            screen.getAllByText('You have a package of that name.').length
        ).toBeGreaterThan(0);
    });

    it('creates a package, keeps it and opens it', async () => {
        const created = pkg({
            id: 'p9',
            name: 'New',
            access: 'Owner',
            visibility: 'Private',
        });
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/workflow-packages': () => json(200, []),
            'POST /api/v1/workflow-packages': () => json(201, created),
        });
        const { history } = renderPage(() => <PackagesPage />);

        fireEvent.click(
            await screen.findByRole('button', { name: 'New package' })
        );
        fireEvent.input(screen.getByLabelText('Name'), {
            target: { value: 'New' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));

        await waitFor(() =>
            expect(history.get()).toBe('/packages/p9/workflows')
        );
        expect(
            await api.calls('POST /api/v1/workflow-packages')[0].json()
        ).toMatchObject({ name: 'New', visibility: 'Private' });
        expect(sessionClient().getQueryData(packageKeys.detail('p9'))).toEqual(
            created
        );
        // The list was asked again for the new one.
        await waitFor(() =>
            expect(api.calls('GET /api/v1/workflow-packages')).toHaveLength(2)
        );
    });

    it('shows why an import was refused, then opens the one that worked', async () => {
        let refuse = true;
        fakeApi({
            ...signedIn,
            'GET /api/v1/workflow-packages': () => json(200, []),
            'POST /api/v1/workflows/import/file': () =>
                refuse
                    ? json(400, {
                          code: 'InvalidExport',
                          message: 'Not an export file.',
                      })
                    : json(201, {
                          workflow: { id: 'w9', packageId: 'p9' },
                          intact: false,
                      }),
        });
        const { container, history } = renderPage(() => <PackagesPage />);
        await screen.findByRole('button', { name: 'New package' });
        const input = container.querySelector(
            'input[type="file"]'
        ) as HTMLInputElement;
        const pick = () => {
            Object.defineProperty(input, 'files', {
                configurable: true,
                value: [new File(['{}'], 'w.json')],
            });
            fireEvent.change(input);
        };

        pick();
        expect(await screen.findByText('Not an export file.')).toBeTruthy();

        refuse = false;
        pick();
        await waitFor(() =>
            expect(history.get()).toBe('/packages/p9/workflows/w9?edited=1')
        );
        expect(screen.queryByText('Not an export file.')).toBeNull();
    });
});
