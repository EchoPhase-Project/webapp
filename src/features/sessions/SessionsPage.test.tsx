// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { CsrfService } from '@shared/api/csrf';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import SessionsPage from './SessionsPage';

const firefox =
    'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0';

describe('SessionsPage', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
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

        expect(await screen.findByText('Firefox on X11')).toBeTruthy();
        expect(screen.getByText('echophase-cli')).toBeTruthy();

        fireEvent.click(
            screen.getAllByRole('button', { name: 'Revoke session' })[0]
        );

        await waitFor(() =>
            expect(screen.queryByText('Firefox on X11')).toBeNull()
        );
        const [revoke] = api.calls('DELETE /api/v1/sessions/s1');
        expect(revoke.headers.get(CsrfService.HEADER)).toBe('t0k3n');
        expect(api.calls('GET /api/v1/sessions')).toHaveLength(2);
    });

    it('fetches nothing while signed out', async () => {
        const api = fakeApi({ 'GET /api/v1/auth/me': () => json(401) });

        renderPage(() => <SessionsPage />);

        expect(await screen.findByText('No active sessions')).toBeTruthy();
        expect(api.calls('GET /api/v1/sessions')).toHaveLength(0);
    });
});
