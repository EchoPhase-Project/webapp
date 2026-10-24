import { vi } from 'vitest';

type Handler = (request: Request) => Response | Promise<Response>;

export const json = (status: number, body?: unknown) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

/**
 * A stand-in for the server: `'GET /api/v1/sessions'` → handler. Stubs the
 * global fetch (the API client looks it up per call) and records requests;
 * an unknown route answers 404 so a test sees what it forgot.
 */
export function fakeApi(routes: Record<string, Handler>) {
    const requests: Request[] = [];
    const fetch = vi.fn(
        async (input: RequestInfo | URL, init?: RequestInit) => {
            const request = new Request(input, init);
            requests.push(request.clone());
            const key = `${request.method} ${new URL(request.url).pathname}`;
            const handler = routes[key];
            return handler
                ? handler(request)
                : json(404, { code: 'NotFound', message: key });
        }
    );
    vi.stubGlobal('fetch', fetch);
    return {
        requests,
        /** Requests to one route, e.g. `calls('DELETE /api/v1/sessions/s1')`. */
        calls: (key: string) =>
            requests.filter(
                (r) => `${r.method} ${new URL(r.url).pathname}` === key
            ),
    };
}

/** A signed-in user, as /auth/me and /roles/me answer. */
export const signedIn = {
    'GET /api/v1/auth/me': () =>
        json(200, {
            id: 'u1',
            userName: 'dusty',
            name: 'Dusty',
            timeZone: 'UTC',
        }),
    'GET /api/v1/roles/me': () => json(200, ['admin']),
};
