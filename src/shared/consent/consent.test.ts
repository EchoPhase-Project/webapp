// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

// The store reads localStorage when imported: a fresh module per test.
async function load(stored?: unknown) {
    vi.resetModules();
    localStorage.clear();
    if (stored !== undefined)
        localStorage.setItem('consent', JSON.stringify(stored));
    return import('./consent');
}

describe('consent', () => {
    afterEach(() => localStorage.clear());

    it('has no choice at first and allows nothing optional', async () => {
        const c = await load();
        expect(c.consent()).toBeNull();
        expect(c.granted()).toEqual({ analytics: false, errors: false });
    });

    it('remembers a choice across page loads', async () => {
        const c = await load();
        c.setConsent({ analytics: true, errors: false });
        expect(c.granted()).toEqual({ analytics: true, errors: false });

        const stored: unknown = JSON.parse(localStorage.getItem('consent')!);
        const again = await load(stored);
        expect(again.consent()).toEqual({ analytics: true, errors: false });
    });

    it('asks again after the categories changed (another version)', async () => {
        const c = await load({
            version: 0,
            analytics: true,
            errors: true,
            decidedAt: '2026-01-01T00:00:00Z',
        });
        expect(c.consent()).toBeNull();
    });

    it('asks again when the stored choice is unreadable', async () => {
        vi.resetModules();
        localStorage.setItem('consent', '{not json');
        const c = await import('./consent');
        expect(c.consent()).toBeNull();
    });
});
