import { createSignal } from 'solid-js';
import type { ErrorItem, ServiceStatus } from '@shared/api/types';

/**
 * The service being away: under maintenance (the server says so, 503 with
 * code "Maintenance"), or not answering at all (502, 504, another 503, a
 * network error).
 */
export interface Outage {
    kind: 'maintenance' | 'unavailable';
    /** The server's own words, for maintenance. */
    message?: string;
    /** When to look again. */
    retryAfterMs: number;
}

export const StatusUrl = '/api/v1/status';
export const MinRetryMs = 5_000;
export const MaxRetryMs = 5 * 60_000;
export const DefaultRetryMs = 30_000;

/** Retry-After (seconds, or an HTTP date) as a delay, kept between 5 s and 5 min. */
export function retryDelay(header: string | null, now = Date.now()): number {
    let ms = DefaultRetryMs;
    if (header && header.trim() !== '') {
        const seconds = Number(header);
        const at = Date.parse(header);
        if (Number.isFinite(seconds)) ms = seconds * 1000;
        else if (!Number.isNaN(at)) ms = at - now;
    }
    return Math.min(MaxRetryMs, Math.max(MinRetryMs, ms));
}

/**
 * The body when it is our JSON (the server's, or the webapp's nginx when the
 * server does not answer: both send ErrorBody); undefined for anything else,
 * such as the page of a proxy in front of the webapp or of a captive portal.
 * Read through a clone: the caller still gets the response.
 */
async function jsonOf(res: Response): Promise<unknown> {
    if (!res.headers.get('Content-Type')?.includes('application/json'))
        return undefined;
    try {
        return await res.clone().json();
    } catch {
        return undefined;
    }
}

const isRecord = (body: unknown): body is Record<string, unknown> =>
    typeof body === 'object' && body !== null && !Array.isArray(body);

/** An ErrorBody of the contract. */
const isErrorBody = (body: unknown): body is ErrorItem =>
    isRecord(body) &&
    typeof body.code === 'string' &&
    typeof body.message === 'string';

const optional = (value: unknown, type: 'string' | 'number') =>
    value === undefined || value === null || typeof value === type;

/** A ServiceStatusResponse of the contract: each field the probe reads. */
const isServiceStatus = (body: unknown): body is ServiceStatus =>
    isRecord(body) &&
    typeof body.maintenance === 'boolean' &&
    optional(body.message, 'string') &&
    optional(body.retryAfterSeconds, 'number');

/** What a response says about the service: an outage, or null when it is just an answer. */
export async function outageOf(res: Response): Promise<Outage | null> {
    if (res.status !== 502 && res.status !== 503 && res.status !== 504)
        return null;

    const body = await jsonOf(res);
    const maintenance =
        res.status === 503 && isErrorBody(body) && body.code === 'Maintenance';
    return {
        kind: maintenance ? 'maintenance' : 'unavailable',
        message: maintenance ? body.message : undefined,
        retryAfterMs: retryDelay(res.headers.get('Retry-After')),
    };
}

type Fetch = typeof globalThis.fetch;

export interface OutageWatchDeps {
    /** The unwatched fetch: the status checks go through it. */
    fetch: Fetch;
    setTimeout: (run: () => void, ms: number) => unknown;
    clearTimeout: (handle: unknown) => void;
    /** When the service is back: start over, so every page state is fresh. */
    reload: () => void;
    origin: string;
}

/**
 * Watches the app's API calls for an outage and, while there is one, asks
 * the status endpoint when it is over. A maintenance answer shows at once;
 * anything else (one timeout, a dropped connection) is confirmed with the
 * status endpoint first, so a single bad request does not close the app.
 */
export function createOutageWatch(deps: OutageWatchDeps) {
    const [outage, setOutage] = createSignal<Outage | null>(null);
    let timer: unknown;
    let confirming = false;

    const unavailable = (): Outage => ({
        kind: 'unavailable',
        retryAfterMs: DefaultRetryMs,
    });

    // The service as the status endpoint sees it: null when open.
    const probe = async (): Promise<Outage | null> => {
        try {
            const res = await deps.fetch(StatusUrl, {
                credentials: 'include',
                cache: 'no-store',
            });
            if (!res.ok) return (await outageOf(res)) ?? unavailable();
            // Not the server's answer (a captive portal's page): not open.
            const status = await jsonOf(res);
            if (!isServiceStatus(status)) return unavailable();
            if (!status.maintenance) return null;
            return {
                kind: 'maintenance',
                message: status.message ?? undefined,
                retryAfterMs: retryDelay(
                    status.retryAfterSeconds == null
                        ? null
                        : String(status.retryAfterSeconds)
                ),
            };
        } catch {
            return unavailable();
        }
    };

    const schedule = (ms: number) => {
        deps.clearTimeout(timer);
        timer = deps.setTimeout(() => void check(), ms);
    };

    const show = (found: Outage) => {
        setOutage(found);
        schedule(found.retryAfterMs);
    };

    // While an outage shows: is it over yet?
    const check = async () => {
        const found = await probe();
        if (found) {
            show(found);
            return;
        }
        if (outage()) {
            setOutage(null);
            deps.reload();
        }
    };

    const report = async (found: Outage) => {
        if (found.kind === 'maintenance') {
            if (outage()?.kind !== 'maintenance') show(found);
            return;
        }
        if (outage() || confirming) return;
        confirming = true;
        try {
            const confirmed = await probe();
            if (confirmed) show(confirmed);
        } finally {
            confirming = false;
        }
    };

    const isApi = (input: RequestInfo | URL): boolean => {
        const raw =
            typeof input === 'string'
                ? input
                : input instanceof URL
                  ? input.href
                  : input.url;
        try {
            const url = new URL(raw, deps.origin);
            return (
                url.origin === deps.origin &&
                url.pathname.startsWith('/api/') &&
                url.pathname !== StatusUrl
            );
        } catch {
            return false;
        }
    };

    /** fetch, watched: API answers and failures are looked at; nothing else changes. */
    const watch =
        (fetchFn: Fetch): Fetch =>
        async (input, init) => {
            const api = isApi(input);
            try {
                const res = await fetchFn(input, init);
                if (api) {
                    const found = await outageOf(res);
                    if (found) void report(found);
                }
                return res;
            } catch (error) {
                const aborted =
                    error instanceof DOMException &&
                    error.name === 'AbortError';
                if (api && !aborted) void report(unavailable());
                throw error;
            }
        };

    return {
        outage: outage,
        watch,
        /** Look now instead of waiting (the "Try now" button). */
        retryNow: () => void check(),
    };
}
