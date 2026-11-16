import { describe, expect, it } from 'vitest';
import { fuzzy, levenshteinLimited, matchOptions } from './text-match';

describe('fuzzy', () => {
    it('matches the letters of the query in order', () => {
        expect(fuzzy('russian', 'rsn')).toBe(true);
        expect(fuzzy('russian', 'russian')).toBe(true);
    });

    it('ignores case', () => {
        expect(fuzzy('Russian', 'rUS')).toBe(true);
    });

    it('fails when the letters are out of order', () => {
        expect(fuzzy('russian', 'nr')).toBe(false);
        expect(fuzzy('ru', 'rux')).toBe(false);
    });

    it('matches anything with an empty query', () => {
        expect(fuzzy('russian', '')).toBe(true);
        expect(fuzzy('', '')).toBe(true);
    });
});

describe('levenshteinLimited', () => {
    it('is 0 for equal strings', () => {
        expect(levenshteinLimited('english', 'english', 2)).toBe(0);
    });

    it('counts one substitution, insertion or deletion', () => {
        expect(levenshteinLimited('cat', 'cut', 2)).toBe(1);
        expect(levenshteinLimited('cat', 'cats', 2)).toBe(1);
        expect(levenshteinLimited('cats', 'cat', 2)).toBe(1);
    });

    it('returns the limit plus one above the limit', () => {
        expect(levenshteinLimited('abcd', 'wxyz', 2)).toBe(3);
        expect(levenshteinLimited('kitten', 'sitting', 3)).toBe(3);
        expect(levenshteinLimited('kitten', 'sitting', 2)).toBe(3);
    });

    it('stops at once when the lengths differ by more than the limit', () => {
        expect(levenshteinLimited('a', 'abcdef', 2)).toBe(3);
        expect(levenshteinLimited('', 'abc', 1)).toBe(2);
    });
});

type Opt = { label: string; name?: string };

const byLabel = (o: Opt) => [o.label];

describe('matchOptions', () => {
    const options: Opt[] = [
        { label: 'EN', name: 'English' },
        { label: 'RU', name: 'Russian' },
        { label: 'DE', name: 'German' },
    ];

    it('returns all options for a blank query', () => {
        expect(matchOptions(options, '', byLabel)).toEqual(options);
        expect(matchOptions(options, '   ', byLabel)).toEqual(options);
    });

    it('puts fuzzy matches before Levenshtein matches', () => {
        const list: Opt[] = [{ label: 'bat' }, { label: 'xcatx' }];
        // "bat" is one edit from "cat"; "xcatx" holds "cat" in order.
        expect(matchOptions(list, 'cat', byLabel)).toEqual([
            { label: 'xcatx' },
            { label: 'bat' },
        ]);
    });

    it('puts the smaller distance first', () => {
        const list: Opt[] = [{ label: 'dun' }, { label: 'dot' }];
        // "dun" is two edits from "dog", "dot" is one.
        expect(matchOptions(list, 'dog', byLabel)).toEqual([
            { label: 'dot' },
            { label: 'dun' },
        ]);
    });

    it('keeps the input order for equal matches', () => {
        const list: Opt[] = [
            { label: 'alpha' },
            { label: 'lamp' },
            { label: 'pal' },
        ];
        expect(matchOptions(list, 'a', byLabel)).toEqual(list);
    });

    it('ignores case and spaces around the query', () => {
        expect(matchOptions(options, '  RUSS ', (o) => [o.name ?? ''])).toEqual(
            [{ label: 'RU', name: 'Russian' }]
        );
    });

    it('matches on any of several fields', () => {
        const fields = (o: Opt) => [o.label, o.name ?? ''];
        expect(matchOptions(options, 'germ', fields)).toEqual([
            { label: 'DE', name: 'German' },
        ]);
        expect(matchOptions(options, 'en', fields)[0]).toEqual({
            label: 'EN',
            name: 'English',
        });
    });

    it('takes the closest field', () => {
        const list: Opt[] = [
            { label: 'dun', name: 'zzzzz' },
            { label: 'zzzzz', name: 'dot' },
        ];
        expect(
            matchOptions(list, 'dog', (o) => [o.label, o.name ?? ''])
        ).toEqual([list[1], list[0]]);
    });

    it('honours a custom distance limit', () => {
        const list: Opt[] = [{ label: 'dun' }];
        expect(matchOptions(list, 'dog', byLabel, 1)).toEqual([]);
    });

    it('returns an empty list when nothing matches', () => {
        expect(matchOptions(options, 'xyzzy', byLabel)).toEqual([]);
    });
});
