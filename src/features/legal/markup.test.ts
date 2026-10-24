import { describe, expect, it } from 'vitest';
import { blocksOf, inlinesOf } from './markup';

describe('blocksOf', () => {
    it('splits paragraphs on blank lines and joins their lines', () => {
        expect(blocksOf('One\ntwo.\n\nThree.')).toEqual([
            { kind: 'p', text: 'One two.' },
            { kind: 'p', text: 'Three.' },
        ]);
    });

    it('reads a paragraph of "- " lines as a list', () => {
        expect(blocksOf('Intro:\n\n- a;\n- b.')).toEqual([
            { kind: 'p', text: 'Intro:' },
            { kind: 'list', items: ['a;', 'b.'] },
        ]);
    });
});

describe('inlinesOf', () => {
    it('finds links to site paths, anchors, https and mailto', () => {
        expect(
            inlinesOf(
                'See [the policy](/privacy) or [contact](#c) or [x](https://x.y).'
            )
        ).toEqual([
            'See ',
            { text: 'the policy', href: '/privacy' },
            ' or ',
            { text: 'contact', href: '#c' },
            ' or ',
            { text: 'x', href: 'https://x.y' },
            '.',
        ]);
    });

    it('keeps only the text of other links', () => {
        expect(inlinesOf('[run](javascript:alert(1))')).toEqual(['run', ')']);
        expect(inlinesOf('[plain](http://x.y)')).toEqual(['plain']);
    });
});
