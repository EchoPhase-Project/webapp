// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { expectNoA11yViolations } from '@shared/testing/axe';
import type { ApiClient, CreatedApiClient } from '@shared/api/types';
import ApiClientsPage from './ApiClientsPage';

// The secret notice's live region: the first one; the list's loading
// region (SkeletonScope) follows it.
const notice = () => screen.getAllByRole('status')[0];

// Typed by the contract: a fixture that drifts from the server's answer
// fails tsc.
const client = (over: Partial<ApiClient> = {}): ApiClient => ({
    id: 'c1',
    name: 'bot',
    permissions: [],
    expiresAt: null,
    lastUsedAt: null,
    secretRotatedAt: null,
    createdAt: '2026-10-24T12:00:00Z',
    updatedAt: '2026-10-24T12:00:00Z',
    ...over,
});
const created: CreatedApiClient = { client: client(), clientSecret: 's3cr3t' };

describe('ApiClientsPage', () => {
    it('shows an error under the field it is about', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/api-clients': () => json(200, []),
            'POST /api/v1/api-clients': () =>
                json(400, [
                    {
                        code: 'Invalid',
                        message: 'Name is taken.',
                        field: 'name',
                    },
                ]),
        });

        renderPage(() => <ApiClientsPage />);
        fireEvent.click(
            await screen.findByRole('button', { name: 'New client' })
        );
        fireEvent.input(await screen.findByLabelText('Name'), {
            target: { value: 'bot' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));

        const input = screen.getByLabelText('Name');
        await screen.findAllByText('Name is taken.');
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(
            document.getElementById(input.getAttribute('aria-describedby')!)
                ?.textContent
        ).toBe('Name is taken.');
    });

    it('creates a client, shows its secret once and lists it', async () => {
        let clients: unknown[] = [];
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/api-clients': () => json(200, clients),
            'POST /api/v1/api-clients': () => {
                clients = [client()];
                return json(200, created);
            },
        });

        renderPage(() => <ApiClientsPage />);
        // The live region is there, empty, before the secret comes.
        await screen.findAllByRole('status');
        const status = notice();
        expect(status.textContent).toBe('');
        fireEvent.click(
            await screen.findByRole('button', { name: 'New client' })
        );
        fireEvent.input(await screen.findByLabelText('Name'), {
            target: { value: 'bot' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));

        const shown = await screen.findByText('s3cr3t');
        // Announced: a short message, never the secret itself, which stays
        // plain, visible text for the user to read when they move to it.
        expect(status.textContent).toBe(
            'Client created. Copy the secret now: it is shown only once.'
        );
        expect(status.textContent).not.toContain('s3cr3t');
        expect(status.contains(shown)).toBe(false);
        expect(
            shown.closest('[aria-live], [role="status"], [role="alert"]')
        ).toBeNull();
        expect(shown.closest('[aria-hidden="true"], [hidden]')).toBeNull();
        expect(shown.closest('.visually-hidden')).toBeNull();
        expect(shown.hasAttribute('aria-label')).toBe(false);
        expect(document.querySelector('dialog')?.hasAttribute('open')).toBe(
            false
        );
        expect(await screen.findByText('bot')).toBeTruthy();
        expect(api.calls('GET /api/v1/api-clients')).toHaveLength(2);
        const [create] = api.calls('POST /api/v1/api-clients');
        expect(await create.json()).toEqual({ name: 'bot', expiresAt: null });
        await expectNoA11yViolations();
    });
});

describe('ApiClientsPage secret', () => {
    it('announces "Copied" in the same region, without the secret', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText: () => Promise.resolve() },
        });
        fakeApi({
            ...signedIn,
            'GET /api/v1/api-clients': () => json(200, []),
            'POST /api/v1/api-clients': () => json(200, created),
        });
        renderPage(() => <ApiClientsPage />);
        fireEvent.click(
            await screen.findByRole('button', { name: 'New client' })
        );
        fireEvent.input(await screen.findByLabelText('Name'), {
            target: { value: 'bot' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        await screen.findByText('s3cr3t');

        const status = notice();
        fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
        await waitFor(() => expect(status.textContent).toBe('Copied'));
        expect(screen.getByText('s3cr3t')).toBeTruthy();

        // Done hides the secret; the region stays on the page, empty.
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(screen.queryByText('s3cr3t')).toBeNull();
        expect(notice()).toBe(status);
        expect(status.textContent).toBe('');
        await expectNoA11yViolations();
        Reflect.deleteProperty(navigator, 'clipboard');
    });
});

describe('ApiClientsPage list', () => {
    it('shows a failed list as an error, not as an empty list', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/api-clients': () =>
                json(500, { code: 'TestBroken', message: 'Try later.' }),
        });
        renderPage(() => <ApiClientsPage />);

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toBe('Try later.');
        expect(screen.queryByText('No API clients')).toBeNull();
        expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    });
});

describe('ApiClientsPage loading', () => {
    it('shows rows of bars while the list loads, then the clients', async () => {
        let answer: () => void = () => {};
        const arrived = new Promise<void>((ok) => (answer = ok));
        fakeApi({
            ...signedIn,
            'GET /api/v1/api-clients': async () => {
                await arrived;
                return json(200, [client()]);
            },
        });
        renderPage(() => <ApiClientsPage />);

        expect(
            await screen.findByRole('heading', {
                level: 1,
                name: 'API clients',
            })
        ).toBeTruthy();
        await waitFor(() =>
            expect(document.querySelector('td .skeleton-text')).not.toBeNull()
        );
        expect(screen.queryByText('No API clients')).toBeNull();
        await expectNoA11yViolations();

        answer();
        expect(await screen.findByText('bot')).toBeTruthy();
        expect(document.querySelector('.skeleton-text')).toBeNull();
    });
});

describe('ApiClientsPage dialog', () => {
    it('opens the form clean each time: no old values, no old errors', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/api-clients': () => json(200, []),
            'POST /api/v1/api-clients': () =>
                json(400, [
                    {
                        code: 'Invalid',
                        message: 'Name is taken.',
                        field: 'name',
                    },
                ]),
        });
        renderPage(() => <ApiClientsPage />);

        const open = await screen.findByRole('button', { name: 'New client' });
        fireEvent.click(open);
        fireEvent.input(screen.getByLabelText('Name'), {
            target: { value: 'bot' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));
        await screen.findAllByText('Name is taken.');
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));

        fireEvent.click(open);
        const name = screen.getByLabelText<HTMLInputElement>('Name');
        expect(name.value).toBe('');
        expect(name.getAttribute('aria-invalid')).toBe('false');
        expect(screen.queryByText('Name is taken.')).toBeNull();
    });

    it('opens the form in a dialog and closes it with its button', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/api-clients': () => json(200, []),
        });
        renderPage(() => <ApiClientsPage />);

        const open = await screen.findByRole('button', { name: 'New client' });
        const dialog = () => document.querySelector('dialog')!;
        expect(dialog().hasAttribute('open')).toBe(false);
        fireEvent.click(open);
        expect(dialog().hasAttribute('open')).toBe(true);
        expect(dialog().getAttribute('aria-labelledby')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(dialog().hasAttribute('open')).toBe(false);
    });
});

describe('ApiClientsPage delete', () => {
    it('deletes a client only after the confirmation', async () => {
        let clients = [client()];
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/api-clients': () => json(200, clients),
            'DELETE /api/v1/api-clients/c1': () => {
                clients = [];
                return json(200);
            },
        });
        renderPage(() => <ApiClientsPage />);

        fireEvent.click(
            await screen.findByRole('button', { name: 'Delete bot' })
        );
        expect(api.calls('DELETE /api/v1/api-clients/c1')).toHaveLength(0);
        expect(screen.getByText(/bot stops working at once/)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(await screen.findByText('No API clients')).toBeTruthy();
        expect(api.calls('DELETE /api/v1/api-clients/c1')).toHaveLength(1);
        // The list asked once more, after the deletion.
        expect(api.calls('GET /api/v1/api-clients')).toHaveLength(2);
    });

    it('shows a refused delete in the dialog, which stays open', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/api-clients': () => json(200, [client()]),
            'DELETE /api/v1/api-clients/c1': () =>
                json(500, { code: 'TestBroken', message: 'Try later.' }),
        });
        renderPage(() => <ApiClientsPage />);

        fireEvent.click(
            await screen.findByRole('button', { name: 'Delete bot' })
        );
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toBe('Try later.');
        expect(document.activeElement).toBe(alert);
        expect(screen.getByRole('alertdialog').contains(alert)).toBe(true);
        expect(screen.getByText(/bot stops working at once/)).toBeTruthy();

        // Cancel closes it; the next time it opens without the old error.
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete bot' }));
        expect(screen.queryByRole('alert')).toBe(null);
    });
});
