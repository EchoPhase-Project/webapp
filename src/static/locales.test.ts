import { describe, expect, it } from 'vitest';

// Locale files: <code>.json (site-wide) and <namespace>.<code>.json (one
// page), with English as the source of each. Weblate writes the translations;
// one may lag behind English (missing strings show in English) but must not
// carry keys English no longer has.
const files = import.meta.glob<unknown>('./locales/*.json', {
    eager: true,
    import: 'default',
});

const CODE = /^(?:(?<ns>[^.]+)\.)?(?<code>[a-z]{2}(?:-[A-Z]{2})?)$/;
const groups = new Map<string, Map<string, unknown>>();
const unrecognized: string[] = [];
for (const [path, data] of Object.entries(files)) {
    const name = path.replace(/^.*\//, '').replace(/\.json$/, '');
    const match = name.match(CODE);
    if (!match?.groups) {
        unrecognized.push(name);
        continue;
    }
    const ns = match.groups.ns ?? '';
    if (!groups.has(ns)) groups.set(ns, new Map());
    groups.get(ns)!.set(match.groups.code, data);
}

function keys(value: unknown, prefix = ''): string[] {
    if (value === null || typeof value !== 'object') return [prefix];
    return Object.entries(value).flatMap(([k, v]) =>
        keys(v, prefix ? `${prefix}.${k}` : k)
    );
}

const translations = [...groups].flatMap(([ns, locales]) =>
    [...locales.keys()]
        .filter((code) => code !== 'en')
        .map((code) => [ns ? `${ns}.${code}` : code, ns, code] as const)
);

describe('locales', () => {
    it('every file is <code>.json or <namespace>.<code>.json', () => {
        expect(unrecognized).toEqual([]);
    });

    it.each([...groups.keys()].map((ns) => [ns || '(site-wide)', ns]))(
        '%s has an English source',
        (_, ns) => {
            expect(groups.get(ns)!.has('en')).toBe(true);
        }
    );

    it.each(translations)('%s has no keys English lacks', (_, ns, code) => {
        const source = new Set(keys(groups.get(ns)!.get('en')));
        const stale = keys(groups.get(ns)!.get(code)).filter(
            (k) => !source.has(k)
        );
        expect(stale).toEqual([]);
    });

    it('every namespace language is a site-wide language', () => {
        const siteWide = [...groups.get('')!.keys()];
        for (const [, locales] of groups)
            for (const code of locales.keys()) expect(siteWide).toContain(code);
    });
});
