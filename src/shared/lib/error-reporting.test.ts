// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_VERSION } from './build-info';
import { ErrorsTunnel, startErrorReporting } from './error-reporting';

const init = vi.fn();
const close = vi.fn();
vi.mock('@sentry/browser', () => ({ init, close }));

describe('startErrorReporting', () => {
    beforeEach(() => init.mockReset());

    it('starts the SDK with the DSN, through the tunnel', async () => {
        const dsn = 'http://key@glitchtip.monitoring.svc/2';
        expect(
            await startErrorReporting(() => Promise.resolve({ sentryDsn: dsn }))
        ).toBe(true);
        expect(init).toHaveBeenCalledWith(
            expect.objectContaining({
                dsn,
                tunnel: `${ErrorsTunnel}?sentry_key=key`,
                sendDefaultPii: false,
                tracesSampleRate: 0,
                // The build and its contract, so a report names what broke.
                release: '0.0.0-local',
                initialScope: {
                    tags: { api: API_VERSION },
                },
            })
        );
    });

    it('does nothing without a DSN', async () => {
        expect(
            await startErrorReporting(() => Promise.resolve({ sentryDsn: '' }))
        ).toBe(false);
        expect(await startErrorReporting(() => Promise.resolve({}))).toBe(
            false
        );
        expect(init).not.toHaveBeenCalled();
    });
});
