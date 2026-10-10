import { describe, expect, it } from 'vitest';
import { lookup } from './i18n-context';

describe('lookup', () => {
    const t = { auth: { login: 'Log In', empty: '' }, title: 'EchoPhase' };

    it('finds top-level and nested strings', () => {
        expect(lookup(t, 'title')).toBe('EchoPhase');
        expect(lookup(t, 'auth.login')).toBe('Log In');
    });

    it('treats missing, empty and non-string entries as absent', () => {
        expect(lookup(t, 'auth.signup')).toBeUndefined();
        expect(lookup(t, 'auth.empty')).toBeUndefined();
        expect(lookup(t, 'auth')).toBeUndefined();
        expect(lookup(t, 'title.more')).toBeUndefined();
        expect(lookup(undefined, 'title')).toBeUndefined();
    });
});
