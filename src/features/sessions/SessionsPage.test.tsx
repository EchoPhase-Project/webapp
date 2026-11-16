// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@solidjs/testing-library';
import { CsrfService } from '@shared/api/csrf';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { expectNoA11yViolations } from '@shared/testing/axe';
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

    it('shows rows of bars while the list loads, then the sessions', async () => {
        let answer: () => void = () => {};
        const arrived = new Promise<void>((ok) => (answer = ok));
        fakeApi({
            ...signedIn,
            'GET /api/v1/sessions': async () => {
                await arrived;
                return json(200, {
                    data: [{ id: 's1', deviceId: firefox }],
                    hasMore: false,
                });
            },
        });

        renderPage(() => <SessionsPage />);

        // The header is static: it stays a real heading that takes the focus.
        expect(
            await screen.findByRole('heading', {
                level: 1,
                name: 'Active sessions',
            })
        ).toBeTruthy();
        await waitFor(() =>
            expect(document.querySelectorAll('tbody tr')).toHaveLength(3)
        );
        expect(document.querySelector('td .skeleton-text')).not.toBeNull();
        expect(screen.queryByText('No active sessions')).toBeNull();
        expect(screen.getByRole('status').textContent).toBe('Loading…');
        await expectNoA11yViolations();

        answer();
        expect(await screen.findByText('Firefox on Linux')).toBeTruthy();
        expect(document.querySelectorAll('tbody tr')).toHaveLength(1);
        expect(document.querySelector('.skeleton-text')).toBeNull();
        expect(screen.getByRole('status').textContent).toBe('');
    });
});
