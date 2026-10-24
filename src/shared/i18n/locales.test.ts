import { describe, expect, it } from 'vitest';
import type { Translations } from './i18n-context';

// Every locale file, parsed: "<namespace>.<code>" or "<code>" for the site-wide one.
const files = Object.fromEntries(
    Object.entries(
        import.meta.glob<Translations>('@static/locales/*.json', {
            eager: true,
            import: 'default',
        })
    ).map(([path, json]) => [path.replace(/^.*\/|\.json$/g, ''), json])
);

const split = (name: string) => {
    const parts = name.split('.');
    const code = parts.pop()!;
    return { namespace: parts.join('.'), code };
};

/** Dotted paths of every string, e.g. "nav.sessions.label". */
function keysOf(t: Translations, prefix = ''): string[] {
    return Object.entries(t).flatMap(([key, value]) =>
        typeof value === 'string'
            ? [`${prefix}${key}`]
            : keysOf(value, `${prefix}${key}.`)
    );
}

const english = Object.keys(files).filter((n) => split(n).code === 'en');
const others = Object.keys(files).filter((n) => split(n).code !== 'en');

describe('locale files', () => {
    it.each(others)('%s has every string of its English file', (name) => {
        const { namespace } = split(name);
        const en = files[namespace ? `${namespace}.en` : 'en'];
        expect(en, `no English file for ${name}`).toBeDefined();
        const missing = keysOf(en).filter(
            (k) => !keysOf(files[name]).includes(k)
        );
        expect(missing).toEqual([]);
    });

    it.each(others)('%s has nothing its English file lacks', (name) => {
        const { namespace } = split(name);
        const en = keysOf(files[namespace ? `${namespace}.en` : 'en']);
        expect(keysOf(files[name]).filter((k) => !en.includes(k))).toEqual([]);
    });

    it.each(Object.keys(files))('%s has no empty strings', (name) => {
        expect(
            keysOf(files[name]).filter((k) => {
                let v: unknown = files[name];
                for (const part of k.split('.')) v = (v as Translations)[part];
                return (v as string).trim() === '';
            })
        ).toEqual([]);
    });

    it('every language has every namespace', () => {
        const codes = new Set(Object.keys(files).map((n) => split(n).code));
        const namespaces = english.map((n) => split(n).namespace);
        for (const code of codes)
            for (const ns of namespaces)
                expect(
                    files[ns ? `${ns}.${code}` : code],
                    `${ns || '(site-wide)'} in ${code}`
                ).toBeDefined();
    });
});
