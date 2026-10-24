import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DateHelper } from './date-helper';

describe('DateHelper', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    });
    afterEach(() => vi.useRealTimers());

    it('computes expiry dates from now', () => {
        const now = Date.now();
        expect(DateHelper.expiresInSeconds(30).getTime() - now).toBe(30_000);
        expect(DateHelper.expiresInMinutes(2).getTime() - now).toBe(120_000);
        expect(DateHelper.expiresInHours(1).getTime() - now).toBe(3_600_000);
        expect(DateHelper.expiresInDays(1).getTime() - now).toBe(86_400_000);
    });

    it('round-trips a datetime-local value through UTC', () => {
        const local = '2026-03-04T05:06';
        const iso = DateHelper.fromLocalInput(local);
        expect(iso).toMatch(/Z$/);
        expect(DateHelper.toLocalInput(new Date(iso!))).toBe(local);
    });

    it('rejects empty and invalid datetime-local values', () => {
        expect(DateHelper.fromLocalInput('')).toBeNull();
        expect(DateHelper.fromLocalInput('not a date')).toBeNull();
    });

    it('formats API times, falling back on an unknown zone', () => {
        const iso = '2026-03-04T05:06:00Z';
        expect(DateHelper.format(null)).toBe('');
        expect(DateHelper.format(iso, 'UTC', 'en-GB')).toContain('05:06');
        expect(DateHelper.format(iso, 'Not/AZone', 'en-GB')).not.toBe('');
    });
});
