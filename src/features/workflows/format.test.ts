import { describe, expect, it } from 'vitest';
import { formatDuration, statusTone } from './format';

describe('formatDuration', () => {
    it('reads as people say it, in their language', () => {
        expect(formatDuration(850, 'en')).toBe('850 ms');
        expect(formatDuration(4200, 'en')).toBe('4.2 sec');
        expect(formatDuration(185_000, 'en')).toBe('3 min 5 sec');
        expect(formatDuration(1, 'ru')).toBe('1 мс');
        expect(formatDuration(null)).toBe('');
    });

    it('gives each status a tone', () => {
        expect(statusTone('succeeded')).toBe('ok');
        expect(statusTone('timedOut')).toBe('bad');
        expect(statusTone('running')).toBe('busy');
        expect(statusTone('cancelled')).toBe('quiet');
    });
});
