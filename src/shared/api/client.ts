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

const unauthorizedListeners = new Set<(request: Request) => void>();

/**
 * Called with the request that got a 401 outside signing in: the session
 * ended (the server refreshes expired access tokens itself). Returns an
 * unsubscribe.
 */
export function onUnauthorized(
    listener: (request: Request) => void
): () => void {
    unauthorizedListeners.add(listener);
    return () => unauthorizedListeners.delete(listener);
}

// These answer 401 as part of signing in (me while signed out, a wrong
// password): that is no news. The rest of /auth/me is a signed-in user's.
const SigningIn = new Set([
    'POST /api/v1/auth/login',
    'POST /api/v1/auth/register',
    'GET /api/v1/auth/me',
]);

const sessionEnd: Middleware = {
    onResponse({ request, response, schemaPath }) {
        if (
            response.status === 401 &&
            !SigningIn.has(`${request.method} ${schemaPath}`)
        )
            unauthorizedListeners.forEach((listener) => listener(request));
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
api.use(csrf, sessionEnd);

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
 * What a failed call throws: the API's error items, as forms show them, and
 * the HTTP status (0: no answer).
 */
export class ApiError extends Error {
    readonly errors: ErrorItem[];
    readonly status: number;

    constructor(errors: ErrorItem[], status: number) {
        super(errors[0]?.message ?? 'Request failed');
        this.name = 'ApiError';
        this.errors = errors;
        this.status = status;
    }
}

const isAbort = (e: unknown) =>
    e instanceof DOMException && e.name === 'AbortError';

/**
 * Awaits a call of `api`: its data, or an ApiError. A dropped connection is
 * a network_error with status 0; an aborted request throws its AbortError.
 */
export async function request<T>(
    call: Promise<{ data?: T; error?: unknown; response: Response }>
): Promise<T> {
    let answer: Awaited<typeof call>;
    try {
        answer = await call;
    } catch (e) {
        if (isAbort(e)) throw e;
        throw new ApiError([NetworkError], 0);
    }
    const { data, error, response } = answer;
    if (!response.ok)
        throw new ApiError(errorsOf(error, response), response.status);
    return data as T;
}

/**
 * Awaits a call of `api` as an ApiResult: no exceptions to catch, a
 * dropped connection is a network_error. An aborted request still throws.
 * On its way out: new code uses request().
 */
export async function send<T>(
    call: Promise<{ data?: T; error?: unknown; response: Response }>
): Promise<ApiResult<T>> {
    try {
        return { ok: true, data: await request(call) };
    } catch (e) {
        if (e instanceof ApiError) return { ok: false, errors: e.errors };
        throw e;
    }
}

/**
 * For the few answers the contract leaves undescribed (the server returns a
 * projection, see types.ts): the caller names their shape. Drop each use
 * once the server documents the response.
 */
export const untyped = <T>(result: ApiResult<unknown>) =>
    result as ApiResult<T>;

/** The data of a successful answer, or `fallback` when the call failed. */
export function dataOr<T, F>(result: ApiResult<T>, fallback: F): T | F {
    return result.ok ? result.data : fallback;
}

/**
 * A multipart body (an upload) from its fields; undefined ones are left out.
 * openapi-fetch sends FormData as is, with its boundary, but the contract
 * types a multipart body as an object of strings: `T` is that type, taken
 * from where the body goes.
 */
export function multipart<T>(
    fields: Record<string, string | Blob | undefined>
): T {
    const form = new FormData();
    for (const [name, value] of Object.entries(fields))
        if (value !== undefined) form.append(name, value);
    return form as unknown as T;
}
