// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import {
    I18nProvider,
    fill,
    useI18n,
    useLocalizer,
    type Translate,
} from './i18n-context';

describe('fill', () => {
    it('puts each value in its placeholder', () => {
        expect(fill('{by} calls {needs}', { by: 'a', needs: 'b' })).toBe(
            'a calls b'
        );
        expect(fill('{count} new', { count: 3 })).toBe('3 new');
    });

    it('fills a repeated placeholder everywhere', () => {
        expect(fill('{x} and {x}', { x: 'y' })).toBe('y and y');
    });

    it('leaves a placeholder without a value as it is', () => {
        expect(fill('{a} {b}', { a: '1' })).toBe('1 {b}');
        expect(fill('{a}', undefined)).toBe('{a}');
        expect(fill('{toString}', {})).toBe('{toString}');
    });

    it('takes a value literally', () => {
        expect(fill('{name}', { name: '$& {other}' })).toBe('$& {other}');
    });
});

function Probe(props: {
    use: () => Translate;
    call: (t: Translate) => string;
}) {
    // eslint-disable-next-line solid/reactivity -- a hook, called once
    const t = props.use();
    return <p data-testid="out">{props.call(t)}</p>;
}

async function shown(
    use: () => Translate,
    call: (t: Translate) => string
): Promise<string> {
    render(() => (
        <I18nProvider>
            <Probe use={use} call={call} />
        </I18nProvider>
    ));
    const out = await screen.findByTestId('out');
    return out.textContent ?? '';
}

describe('useI18n().t', () => {
    it('fills the fallback', async () => {
        expect(
            await shown(
                () => useI18n().t,
                (t) => t('test.missing', '{a}, {b}, {a}; {c}', { a: 1, b: 'x' })
            )
        ).toBe('1, x, 1; {c}');
    });
});

describe('useLocalizer(ns)', () => {
    it('fills a string of the namespace', async () => {
        localStorage.setItem('app_locale', 'ro');
        try {
            await shown(
                () => useLocalizer('files'),
                (t) => t('delete', 'Delete {name}', { name: 'a.txt' })
            );
            expect(await screen.findByText('Șterge a.txt')).toBeTruthy();
        } finally {
            localStorage.removeItem('app_locale');
        }
    });

    it('reads a site-wide ui.* string', async () => {
        localStorage.setItem('app_locale', 'ro');
        try {
            await shown(
                () => useLocalizer('files'),
                (t) => t('ui.delete', 'Delete')
            );
            expect(await screen.findByText('Șterge')).toBeTruthy();
        } finally {
            localStorage.removeItem('app_locale');
        }
    });

    it('fills the fallback of a missing key', async () => {
        expect(
            await shown(
                () => useLocalizer('files'),
                (t) => t('test.missing', '{n} of {n}; {m}', { n: 2 })
            )
        ).toBe('2 of 2; {m}');
    });
});
