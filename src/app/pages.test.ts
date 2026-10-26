import { describe, expect, it } from 'vitest';
// From the project root (Vite resolves a leading / there).
import robots from '/public/robots.txt?raw';
// The pages' modules are not loaded: lazy() only imports on render.
import { PAGES } from './pages';

const allowed = [...robots.matchAll(/^Allow: (\/[^\s]*?)\$$/gm)].map(
    (m) => m[1]
);
// Prefixes (no $): a public page with parameters, and the build's files.
const prefixes = [...robots.matchAll(/^Allow: (\/[^\s$]*)$/gm)].map(
    (m) => m[1]
);
const BUILD = ['/js/', '/assets/'];

describe('pages', () => {
    it('robots.txt allows exactly the public pages', () => {
        const pub = PAGES.filter((p) => p.public).map((p) => p.path);
        // /docs/:slug is the prefix /docs/.
        // /docs/:slug? is /docs as well.
        const exact = pub.flatMap((path) =>
            !path.includes(':')
                ? [path]
                : path.endsWith('?')
                  ? [path.slice(0, path.lastIndexOf('/'))]
                  : []
        );
        const open = pub
            .filter((path) => path.includes(':'))
            .map((path) => path.slice(0, path.indexOf(':')));
        expect(allowed.sort()).toEqual(exact.sort());
        expect(prefixes.filter((p) => !BUILD.includes(p)).sort()).toEqual(
            open.sort()
        );
    });

    it('no public page needs a session', () => {
        expect(PAGES.filter((p) => p.public && p.auth)).toEqual([]);
    });

    it('paths are unique', () => {
        const paths = PAGES.map((p) => p.path);
        expect(new Set(paths).size).toBe(paths.length);
    });
});
