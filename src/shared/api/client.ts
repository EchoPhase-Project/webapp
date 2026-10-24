import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './schema';
import type { ErrorItem } from './types';
import { CsrfService } from './csrf';
import { watchedFetch } from './outage-watch';

const Safe = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * The CSRF token: the server hands it out on sign-in (a response header),
 * and every request that changes something sends it back.
 */
const csrf: Middleware = {
    onRequest({ request }) {
        const token = CsrfService.getToken();
        if (token && !Safe.has(request.method))
            request.headers.set(CsrfService.HEADER, token);
        return request;
    },
    onResponse({ response }) {
        const token = response.headers.get(CsrfService.HEADER);
        if (token) CsrfService.saveToken(token);
        return response;
    },
};

/**
 * The API, typed by its contract (schema.d.ts, `npm run gen:api`): paths,
 * parameters, bodies and answers. Cookies go along; the outage watch sees
 * every answer.
 */
export const api = createClient<paths>({
    // Absolute: Request (outside a browser too) does not take bare paths.
    baseUrl: location.origin,
    credentials: 'include',
    fetch: (request) => watchedFetch(request),
});
api.use(csrf);

export const NetworkError: ErrorItem = {
    code: 'network_error',
    message: 'Network error occurred',
};

/** An answer, or what went wrong as the API's error items. */
export type ApiResult<T> =
    { ok: true; data: T } | { ok: false; errors: ErrorItem[] };

/** The API's error body: ErrorBody[], a single ErrorBody, or anything else. */
export function errorsOf(body: unknown, response: Response): ErrorItem[] {
    if (Array.isArray(body)) return body as ErrorItem[];
    if (
        body &&
        typeof body === 'object' &&
        typeof (body as { code?: unknown }).code === 'string'
    )
        return [body as ErrorItem];
    return [
        {
            code: `http_${response.status}`,
            message: response.statusText || 'Request failed',
        },
    ];
}

/**
 * Awaits a call of `api` as an ApiResult: no exceptions to catch, a
 * dropped connection is a network_error. An aborted request still throws.
 */
export async function send<T>(
    call: Promise<{ data?: T; error?: unknown; response: Response }>
): Promise<ApiResult<T>> {
    try {
        const { data, error, response } = await call;
        return response.ok
            ? { ok: true, data: data as T }
            : { ok: false, errors: errorsOf(error, response) };
    } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') throw e;
        return { ok: false, errors: [NetworkError] };
    }
}

/**
 * For the few answers the contract leaves undescribed (the server returns a
 * projection, see types.ts): the caller names their shape. Drop each use
 * once the server documents the response.
 */
export const untyped = <T>(result: ApiResult<unknown>) =>
    result as ApiResult<T>;
