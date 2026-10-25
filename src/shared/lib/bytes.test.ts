import { describe, expect, it } from 'vitest';
import { formatBytes } from './bytes';

describe('formatBytes', () => {
    it.each([
        [1536, '1.5 kB'],
        [2_500_000, '2.4 MB'],
        [100 * 1024 * 1024, '100 MB'],
        [3 * 1024 ** 3, '3 GB'],
    ])('%d is %s', (bytes, text) => {
        expect(formatBytes(bytes, 'en')).toBe(text);
    });

    // Narrow bytes differ between ICU versions: "740B", "740 B", "740 Б".
    it('writes bytes as the locale does', () => {
        expect(formatBytes(740, 'en')).toMatch(/^740\s?B$/);
        expect(formatBytes(0, 'en')).toMatch(/^0\s?B$/);
    });

    it('speaks the locale', () => {
        expect(formatBytes(2_500_000, 'ru')).toBe('2,4 МБ');
    });
});
