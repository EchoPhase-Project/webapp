// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import ApiClientsPage from './ApiClientsPage';

describe('ApiClientsPage', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

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
                clients = [
                    {
                        Id: 'c1',
                        Name: 'bot',
                        ExpiresAt: null,
                        LastUsedAt: null,
                        SecretRotatedAt: null,
                        CreatedAt: '2026-10-24T12:00:00Z',
                    },
                ];
                return json(200, { clientId: 'c1', clientSecret: 's3cr3t' });
            },
        });

        renderPage(() => <ApiClientsPage />);
        fireEvent.click(
            await screen.findByRole('button', { name: 'New client' })
        );
        fireEvent.input(await screen.findByLabelText('Name'), {
            target: { value: 'bot' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Create' }));

        expect(await screen.findByText('s3cr3t')).toBeTruthy();
        expect(document.querySelector('dialog')?.hasAttribute('open')).toBe(
            false
        );
        expect(await screen.findByText('bot')).toBeTruthy();
        const [create] = api.calls('POST /api/v1/api-clients');
        expect(await create.json()).toEqual({ name: 'bot', expiresAt: null });
    });
});

describe('ApiClientsPage dialog', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
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
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('deletes a client only after the confirmation', async () => {
        let clients = [
            {
                Id: 'c1',
                Name: 'bot',
                ExpiresAt: null,
                LastUsedAt: null,
                SecretRotatedAt: null,
                CreatedAt: '2026-10-24T12:00:00Z',
            },
        ];
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
    });
});
