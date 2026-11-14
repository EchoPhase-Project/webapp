// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CsrfService } from './csrf';
import {
    api,
    dataOr,
    errorsOf,
    multipart,
    NetworkError,
    onUnauthorized,
    send,
} from './client';

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

describe('session end', () => {
    const fetch = vi.fn<(request: Request) => Promise<Response>>();
    const listener = vi.fn<(request: Request) => void>();
    let unsubscribe: () => void;

    beforeEach(() => {
        vi.stubGlobal('fetch', fetch);
        fetch.mockImplementation(() => Promise.resolve(json(401, null)));
        unsubscribe = onUnauthorized(listener);
    });

    afterEach(() => {
        unsubscribe();
        fetch.mockReset();
        listener.mockReset();
    });

    it('is no news on a 401 while signing in', async () => {
        await api.POST('/api/v1/auth/login', {
            body: { userName: 'u', password: 'p' } as never,
        });
        await api.POST('/api/v1/auth/register', { body: {} as never });
        await api.GET('/api/v1/auth/me');

        expect(listener).not.toHaveBeenCalled();
    });

    it.each([
        [
            'PATCH',
            '/api/v1/auth/me',
            () => api.PATCH('/api/v1/auth/me', { body: {} as never }),
        ],
        [
            'PUT',
            '/api/v1/auth/me/avatar',
            () => api.PUT('/api/v1/auth/me/avatar', { body: {} as never }),
        ],
        [
            'DELETE',
            '/api/v1/auth/me/avatar',
            () => api.DELETE('/api/v1/auth/me/avatar'),
        ],
        [
            'POST',
            '/api/v1/auth/me/password',
            () => api.POST('/api/v1/auth/me/password', { body: {} as never }),
        ],
        ['GET', '/api/v1/sessions', () => api.GET('/api/v1/sessions')],
    ])('ends the session on a 401 of %s %s', async (method, path, call) => {
        await call();

        expect(listener).toHaveBeenCalledOnce();
        const [request] = listener.mock.calls[0];
        expect(request).toBeInstanceOf(Request);
        expect(request.method).toBe(method);
        expect(new URL(request.url).pathname).toBe(path);
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

describe('dataOr', () => {
    it('is the data of a success, else the fallback', () => {
        expect(dataOr({ ok: true, data: [1, 2] }, [])).toEqual([1, 2]);
        expect(dataOr({ ok: false, errors: [NetworkError] }, null)).toBeNull();
    });
});

describe('multipart', () => {
    it('makes form data of its fields, without the undefined ones', () => {
        const file = new File(['hi'], 'hi.txt');
        const form = multipart<FormData>({
            File: file,
            Purpose: 'Attachment',
            PackageId: undefined,
        });

        expect(form).toBeInstanceOf(FormData);
        expect((form.get('File') as File).name).toBe('hi.txt');
        expect(form.get('Purpose')).toBe('Attachment');
        expect(form.has('PackageId')).toBe(false);
    });
});
