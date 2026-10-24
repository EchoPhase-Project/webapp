// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('runtimeConfig', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it('fetches /config.json once per page load', async () => {
        const fetch = vi.fn(() =>
            Promise.resolve(new Response('{"umamiWebsiteId":"x"}'))
        );
        vi.stubGlobal('fetch', fetch);
        const { runtimeConfig } = await import('./runtime-config');
        expect(await runtimeConfig()).toEqual({ umamiWebsiteId: 'x' });
        await runtimeConfig();
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('is empty when there is none (the dev server) or it fails', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve(new Response('', { status: 404 })))
        );
        expect(
            await (await import('./runtime-config')).runtimeConfig()
        ).toEqual({});
        vi.resetModules();
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.reject(new TypeError('offline')))
        );
        expect(
            await (await import('./runtime-config')).runtimeConfig()
        ).toEqual({});
    });
});
