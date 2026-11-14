// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@solidjs/testing-library';
import { CsrfService } from '@shared/api/csrf';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import SessionsPage from './SessionsPage';

const firefox =
    'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0';

describe('SessionsPage', () => {
    afterEach(() => {
        sessionStorage.clear();
    });

    it('lists the sessions and revokes one with the CSRF token', async () => {
        CsrfService.saveToken('t0k3n');
        let sessions = [
            { id: 's1', deviceId: firefox },
            { id: 's2', deviceId: 'echophase-cli' },
        ];
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/sessions': () =>
                json(200, { data: sessions, hasMore: false }),
            'DELETE /api/v1/sessions/s1': () => {
                sessions = sessions.filter((s) => s.id !== 's1');
                return json(204);
            },
        });

        renderPage(() => <SessionsPage />);

        expect(await screen.findByText('Firefox on Linux')).toBeTruthy();
        expect(screen.getByText('echophase-cli')).toBeTruthy();

        fireEvent.click(
            screen.getAllByRole('button', { name: 'Revoke session' })[0]
        );

        await waitFor(() =>
            expect(screen.queryByText('Firefox on Linux')).toBeNull()
        );
        const [revoke] = api.calls('DELETE /api/v1/sessions/s1');
        expect(revoke.headers.get(CsrfService.HEADER)).toBe('t0k3n');
        expect(api.calls('GET /api/v1/sessions')).toHaveLength(2);
    });

    it('shows a refused revoke above the list', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/sessions': () =>
                json(200, {
                    data: [{ id: 's1', deviceId: firefox }],
                    hasMore: false,
                }),
            'DELETE /api/v1/sessions/s1': () =>
                json(500, { code: 'TestBroken', message: 'Try later.' }),
        });

        renderPage(() => <SessionsPage />);
        fireEvent.click(
            await screen.findByRole('button', { name: 'Revoke session' })
        );

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toBe('Try later.');
        expect(screen.getByText('Firefox on Linux')).toBeTruthy();
    });

    it('shows a failed list as an error, not as an empty list', async () => {
        let broken = true;
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/sessions': () =>
                broken
                    ? json(500, { code: 'TestBroken', message: 'Try later.' })
                    : json(200, {
                          data: [{ id: 's1', deviceId: firefox }],
                          hasMore: false,
                      }),
        });

        renderPage(() => <SessionsPage />);

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toBe('Try later.');
        expect(screen.queryByText('No active sessions')).toBeNull();

        broken = false;
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(await screen.findByText('Firefox on Linux')).toBeTruthy();
        expect(api.calls('GET /api/v1/sessions')).toHaveLength(2);
    });

    it('revokes every session after the confirmation and signs out', async () => {
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/sessions': () =>
                json(200, {
                    data: [{ id: 's1', deviceId: firefox }],
                    hasMore: false,
                }),
            'DELETE /api/v1/sessions': () => json(204),
        });

        const { otherTab } = renderPage(() => <SessionsPage />);
        await screen.findByText('Firefox on Linux');
        fireEvent.click(screen.getByRole('button', { name: 'Revoke all' }));
        expect(api.calls('DELETE /api/v1/sessions')).toHaveLength(0);
        fireEvent.click(
            within(screen.getByRole('alertdialog')).getByRole('button', {
                name: 'Revoke all',
            })
        );

        await waitFor(() =>
            expect(otherTab.received).toEqual([{ type: 'signed-out' }])
        );
        expect(api.calls('DELETE /api/v1/sessions')).toHaveLength(1);
    });
});
