import { describe, expect, it } from 'vitest';
// From the project root (Vite resolves a leading / there).
import robots from '/public/robots.txt?raw';
// The pages' modules are not loaded: lazy() only imports on render.
import { PAGES } from './pages';

const allowed = [...robots.matchAll(/^Allow: (\/[^\s]*?)\$$/gm)].map(
    (m) => m[1]
);

describe('pages', () => {
    it('robots.txt allows exactly the public pages', () => {
        const pub = PAGES.filter((p) => p.public).map((p) => p.path);
        expect(allowed.sort()).toEqual(pub.sort());
    });

    it('no public page needs a session', () => {
        expect(PAGES.filter((p) => p.public && p.auth)).toEqual([]);
    });

    it('paths are unique', () => {
        const paths = PAGES.map((p) => p.path);
        expect(new Set(paths).size).toBe(paths.length);
    });
});
