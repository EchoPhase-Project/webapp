// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

const calls: string[] = [];
vi.mock('./analytics', () => ({
    startAnalytics: () => (calls.push('analytics:start'), Promise.resolve()),
    stopAnalytics: () => calls.push('analytics:stop'),
}));
vi.mock('./error-reporting', () => ({
    startErrorReporting: () => (calls.push('errors:start'), Promise.resolve()),
    stopErrorReporting: () => (calls.push('errors:stop'), Promise.resolve()),
}));

describe('followConsent', () => {
    it('starts nothing before a choice, then follows it both ways', async () => {
        localStorage.clear();
        const { setConsent } = await import('./consent');
        const { followConsent } = await import('./optional-services');

        const dispose = followConsent();
        expect(calls).toEqual([]);

        setConsent({ analytics: true, errors: false });
        expect(calls).toEqual(['analytics:start']);

        setConsent({ analytics: false, errors: true });
        expect(calls).toEqual([
            'analytics:start',
            'analytics:stop',
            'errors:start',
        ]);
        dispose();
    });
});
