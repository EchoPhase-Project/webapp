// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorsTunnel, startErrorReporting } from './error-reporting';

const init = vi.fn();
vi.mock('@sentry/browser', () => ({ init }));

const config = (status: number, body: unknown) => () =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('startErrorReporting', () => {
    beforeEach(() => init.mockReset());

    it('starts the SDK with the DSN, through the tunnel', async () => {
        const dsn = 'http://key@glitchtip.monitoring.svc/2';
        expect(await startErrorReporting(config(200, { sentryDsn: dsn }))).toBe(
            true
        );
        expect(init).toHaveBeenCalledWith(
            expect.objectContaining({
                dsn,
                tunnel: `${ErrorsTunnel}?sentry_key=key`,
                sendDefaultPii: false,
                tracesSampleRate: 0,
            })
        );
    });

    it('does nothing without a DSN, or without the config', async () => {
        expect(await startErrorReporting(config(200, { sentryDsn: '' }))).toBe(
            false
        );
        expect(await startErrorReporting(config(404, {}))).toBe(false);
        expect(
            await startErrorReporting(() =>
                Promise.reject(new TypeError('offline'))
            )
        ).toBe(false);
        expect(init).not.toHaveBeenCalled();
    });
});
