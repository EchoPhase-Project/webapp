import { describe, expect, it } from 'vitest';
import { API_VERSION, APP_VERSION } from './build-info';

describe('build info', () => {
    it('names the build (local here) and the contract it was made for', () => {
        expect(APP_VERSION).toBe('0.0.0-local');
        expect(API_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
});
