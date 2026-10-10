import { describe, expect, it } from 'vitest';
import localesList from './locales.json';

// Translations come from Weblate as files next to en.json (the source): each
// must have exactly its keys, and locales.json must list every language.
const files = import.meta.glob<unknown>('./locales/*.json', {
    eager: true,
    import: 'default',
});
const locales = Object.fromEntries(
    Object.entries(files)
        .map(([file, data]) => [
            file.match(/\/([a-z]{2}(?:-[A-Z]{2})?)\.json$/)?.[1],
            data,
        ])
        .filter(([code]) => code !== undefined)
) as Record<string, unknown>;

function keys(value: unknown, prefix = ''): string[] {
    if (value === null || typeof value !== 'object') return [prefix];
    return Object.entries(value).flatMap(([k, v]) =>
        keys(v, prefix ? `${prefix}.${k}` : k)
    );
}

const source = keys(locales.en).sort();

describe('locales', () => {
    it.each(Object.keys(locales))('%s has the keys of en.json', (code) => {
        expect(keys(locales[code]).sort()).toEqual(source);
    });

    it('locales.json lists every translation', () => {
        expect(Object.keys(localesList).sort()).toEqual(
            Object.keys(locales).sort()
        );
    });
});
