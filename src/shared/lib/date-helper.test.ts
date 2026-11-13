import { describe, expect, it } from 'vitest';
import { DateHelper } from './date-helper';

describe('DateHelper', () => {
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
