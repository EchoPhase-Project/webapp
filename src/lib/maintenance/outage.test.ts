import { describe, expect, it } from 'vitest';
import {
    createOutageWatch,
    DefaultRetryMs,
    MaxRetryMs,
    MinRetryMs,
    outageOf,
    retryDelay,
    StatusUrl,
} from './outage';

const json = (
    status: number,
    body: unknown,
    headers: Record<string, string> = {}
) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    });

describe('retryDelay', () => {
    it('reads seconds and HTTP dates, within bounds', () => {
        expect(retryDelay('60')).toBe(60_000);
        expect(retryDelay('1')).toBe(MinRetryMs);
        expect(retryDelay('86400')).toBe(MaxRetryMs);
        const now = Date.parse('2026-10-23T12:00:00Z');
        expect(retryDelay('Fri, 23 Oct 2026 12:01:00 GMT', now)).toBe(60_000);
    });

    it('falls back when absent or unreadable', () => {
        expect(retryDelay(null)).toBe(DefaultRetryMs);
        expect(retryDelay('')).toBe(DefaultRetryMs);
        expect(retryDelay('soon')).toBe(DefaultRetryMs);
    });
});

describe('outageOf', () => {
    it('knows maintenance by its code, with the message and Retry-After', async () => {
        const found = await outageOf(
            json(
                503,
                { code: 'Maintenance', message: 'Upgrading' },
                { 'Retry-After': '120' }
            )
        );
        expect(found).toEqual({
            kind: 'maintenance',
            message: 'Upgrading',
            retryAfterMs: 120_000,
        });
    });

    it('takes other gateway errors as the service being unavailable', async () => {
        expect(
            (
                await outageOf(
                    new Response('<html>Bad Gateway</html>', { status: 502 })
                )
            )?.kind
        ).toBe('unavailable');
        expect((await outageOf(json(503, { code: 'Unavailable' })))?.kind).toBe(
            'unavailable'
        );
        expect((await outageOf(new Response('', { status: 504 })))?.kind).toBe(
            'unavailable'
        );
    });

    it('leaves ordinary answers alone, and the response readable', async () => {
        const res = json(500, { code: 'Oops' });
        expect(await outageOf(res)).toBeNull();
        expect(await outageOf(json(401, {}))).toBeNull();
        expect(await outageOf(json(200, {}))).toBeNull();

        const maintenance = json(503, { code: 'Maintenance' });
        await outageOf(maintenance);
        expect(await maintenance.json()).toEqual({ code: 'Maintenance' }); // read through a clone
    });
});

/** A watch with fake time, a scripted status endpoint and an API. */
function harness(status: () => Response | Promise<Response>) {
    const timers: { run: () => void; ms: number }[] = [];
    let reloads = 0;
    let statusCalls = 0;
    const watch = createOutageWatch({
        fetch: async (input) => {
            if (String(input) === StatusUrl) {
                statusCalls++;
                return status();
            }
            throw new Error(`unexpected ${String(input)}`);
        },
        setTimeout: (run, ms) => timers.push({ run, ms }),
        clearTimeout: () => timers.splice(0),
        reload: () => reloads++,
        origin: 'https://echophase.test',
    });
    return {
        watch,
        api: (respond: () => Response | Promise<Response>) =>
            watch.watch(async () => respond()),
        tick: async () => {
            const next = timers.shift();
            next?.run();
            await new Promise((r) => setTimeout(r, 0));
            return next?.ms;
        },
        get reloads() {
            return reloads;
        },
        get statusCalls() {
            return statusCalls;
        },
        settle: () => new Promise((r) => setTimeout(r, 0)),
    };
}

describe('createOutageWatch', () => {
    it('shows maintenance at once, then reloads when the status says it is over', async () => {
        let open = false;
        const h = harness(() =>
            json(
                200,
                open
                    ? { maintenance: false }
                    : { maintenance: true, retryAfterSeconds: 60 }
            )
        );
        const fetch = h.api(() =>
            json(
                503,
                { code: 'Maintenance', message: 'Upgrading' },
                { 'Retry-After': '30' }
            )
        );

        const res = await fetch('/api/v1/workflows');
        expect(res.status).toBe(503); // the page still gets its answer
        await h.settle();
        expect(h.watch.outage()).toMatchObject({
            kind: 'maintenance',
            message: 'Upgrading',
        });

        expect(await h.tick()).toBe(30_000); // waits as told, then asks
        expect(h.watch.outage()?.kind).toBe('maintenance');
        expect(h.reloads).toBe(0);

        open = true;
        expect(await h.tick()).toBe(60_000);
        expect(h.watch.outage()).toBeNull();
        expect(h.reloads).toBe(1);
    });

    it('does not close the app for one bad answer while the service is up', async () => {
        const h = harness(() => json(200, { maintenance: false }));
        const fetch = h.api(() => new Response('', { status: 504 }));

        await fetch('/api/v1/sessions');
        await h.settle();
        expect(h.statusCalls).toBe(1);
        expect(h.watch.outage()).toBeNull();
    });

    it('shows the service as unavailable when the status cannot be reached either', async () => {
        const h = harness(() =>
            Promise.reject(new TypeError('Failed to fetch'))
        );
        const fetch = h.api(() =>
            Promise.reject(new TypeError('Failed to fetch'))
        );

        await expect(fetch('/api/v1/auth/me')).rejects.toThrow(
            'Failed to fetch'
        );
        await h.settle();
        expect(h.watch.outage()?.kind).toBe('unavailable');
    });

    it('ignores requests that are not the API, and aborted ones', async () => {
        const h = harness(() => Promise.reject(new TypeError('down')));
        await h.api(() => new Response('', { status: 502 }))(
            '/assets/logo.svg'
        );
        await h.api(() => new Response('', { status: 502 }))(
            'https://elsewhere.test/api/x'
        );
        await expect(
            h.api(() =>
                Promise.reject(new DOMException('aborted', 'AbortError'))
            )('/api/v1/sessions')
        ).rejects.toThrow('aborted');
        await h.settle();
        expect(h.statusCalls).toBe(0);
        expect(h.watch.outage()).toBeNull();
    });

    it('checks the status once for many failing requests at a time', async () => {
        let resolve: (r: Response) => void = () => {};
        const h = harness(() => new Promise<Response>((r) => (resolve = r)));
        const fetch = h.api(() => new Response('', { status: 502 }));

        await Promise.all([fetch('/api/a'), fetch('/api/b'), fetch('/api/c')]);
        await h.settle();
        resolve(json(200, { maintenance: false }));
        await h.settle();
        expect(h.statusCalls).toBe(1);
    });
});
