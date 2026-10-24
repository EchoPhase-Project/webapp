// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CsrfService } from './csrf';
import { api, errorsOf, NetworkError, send } from './client';

const json = (
    status: number,
    body: unknown,
    headers: Record<string, string> = {}
) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    });

describe('api client', () => {
    const fetch = vi.fn<(request: Request) => Promise<Response>>();

    beforeEach(() => {
        vi.stubGlobal('fetch', fetch);
        sessionStorage.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        fetch.mockReset();
    });

    it('sends the CSRF token with changes only, and cookies always', async () => {
        CsrfService.saveToken('t0k3n');
        fetch.mockResolvedValue(new Response(null, { status: 204 }));

        await api.GET('/api/v1/sessions');
        await api.DELETE('/api/v1/sessions/{id}', {
            params: { path: { id: 'abc' } },
        });

        const [get, del] = fetch.mock.calls.map(([request]) => request);
        expect(get.headers.get(CsrfService.HEADER)).toBeNull();
        expect(get.credentials).toBe('include');
        expect(del.method).toBe('DELETE');
        expect(new URL(del.url).pathname).toBe('/api/v1/sessions/abc');
        expect(del.headers.get(CsrfService.HEADER)).toBe('t0k3n');
    });

    it('keeps the token the server hands out on sign-in', async () => {
        fetch.mockResolvedValue(
            new Response(null, {
                status: 204,
                headers: { [CsrfService.HEADER]: 'fresh' },
            })
        );
        await api.POST('/api/v1/auth/login', {
            body: { userName: 'u', password: 'p' } as never,
        });
        expect(CsrfService.getToken()).toBe('fresh');
    });

    it('turns answers into results', async () => {
        fetch.mockResolvedValueOnce(json(200, ['admin']));
        expect(await send(api.GET('/api/v1/roles/me'))).toEqual({
            ok: true,
            data: ['admin'],
        });

        fetch.mockResolvedValueOnce(
            json(400, [{ code: 'Invalid', message: 'Bad name', field: 'name' }])
        );
        expect(await send(api.GET('/api/v1/roles/me'))).toEqual({
            ok: false,
            errors: [{ code: 'Invalid', message: 'Bad name', field: 'name' }],
        });
    });

    it('reports a dropped connection as a network error', async () => {
        fetch.mockRejectedValue(new TypeError('Failed to fetch'));
        expect(await send(api.GET('/api/v1/roles/me'))).toEqual({
            ok: false,
            errors: [NetworkError],
        });
    });
});

describe('errorsOf', () => {
    const res = new Response(null, { status: 502, statusText: 'Bad Gateway' });

    it('reads a list or a single error body', () => {
        const item = { code: 'NotFound', message: 'Gone' };
        expect(errorsOf([item], res)).toEqual([item]);
        expect(errorsOf(item, res)).toEqual([item]);
    });

    it('falls back to the status for anything else', () => {
        expect(errorsOf('<html>proxy page</html>', res)).toEqual([
            { code: 'http_502', message: 'Bad Gateway' },
        ]);
    });
});
