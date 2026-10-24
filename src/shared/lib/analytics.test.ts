// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { StatsPath, startAnalytics } from './analytics';

const tracker = () =>
    document.head.querySelector<HTMLScriptElement>(
        `script[src="${StatsPath}/script.js"]`
    );

describe('startAnalytics', () => {
    afterEach(() => tracker()?.remove());

    it('loads the tracker from this origin, reporting here, honouring Do Not Track', async () => {
        expect(
            await startAnalytics(() =>
                Promise.resolve({ umamiWebsiteId: 'site-1' })
            )
        ).toBe(true);
        const script = tracker()!;
        expect(script.dataset.websiteId).toBe('site-1');
        expect(script.dataset.hostUrl).toBe(`${location.origin}${StatsPath}`);
        expect(script.dataset.doNotTrack).toBe('true');
        expect(script.defer).toBe(true);
    });

    it('loads nothing without a website id', async () => {
        expect(
            await startAnalytics(() => Promise.resolve({ umamiWebsiteId: ' ' }))
        ).toBe(false);
        expect(tracker()).toBeNull();
    });
});
