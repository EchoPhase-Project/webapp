import { describe, expect, it } from 'vitest';
// The file's text (vitest.config.ts lets this stylesheet through as is).
import tokens from './tokens.scss?raw';

/** The --name: #hex tokens of one theme block (`:root {` or `[data-theme='dark'] {`). */
function theme(header: string): Record<string, string> {
    const start = tokens.indexOf(header);
    const block = tokens.slice(start, tokens.indexOf('\n}', start));
    return Object.fromEntries(
        [...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [
            m[1],
            m[2],
        ])
    );
}

// WCAG 2 relative luminance and contrast ratio.
function luminance(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/** A --name: N% token of one theme block, as a fraction. */
function percent(header: string, name: string): number {
    const start = tokens.indexOf(header);
    const block = tokens.slice(start, tokens.indexOf('\n}', start));
    const match = block.match(new RegExp(`--${name}:\\s*([0-9.]+)%;`));
    if (!match) throw new Error(`--${name} is not in ${header}`);
    return Number(match[1]) / 100;
}

// hsl() as #rrggbb, the way the browser computes it.
function hsl(hue: number, s: number, l: number): string {
    const k = (n: number) => (n + hue / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const channel = (n: number) =>
        Math.round(
            255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))
        )
            .toString(16)
            .padStart(2, '0');
    return `#${channel(0)}${channel(8)}${channel(4)}`;
}

const surfaces = ['bg', 'surface', 'surface-raised'];
// Foreground token, the least contrast it needs on every surface.
const rules: [string, number][] = [
    ['text', 7],
    ['text-muted', 4.5],
    ['text-hover', 4.5],
    ['link', 4.5],
    ['link-hover', 4.5],
    ['danger', 4.5],
    ['success', 4.5],
    ['warning', 4.5],
    ['accent', 3],
    ['focus', 3],
];

describe.each([
    ['light', ':root {'],
    ['dark', "[data-theme='dark'] {"],
])('%s theme', (_, header) => {
    const t = theme(header);

    it('defines every token', () => {
        for (const name of [
            ...surfaces,
            ...rules.map(([n]) => n),
            'primary',
            'on-primary',
            'hover',
            'nav-surface',
            'border',
            'shadow',
        ])
            expect(t[name], name).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it.each(rules)('%s reads on every surface', (name, min) => {
        for (const surface of surfaces)
            expect(
                contrast(t[name], t[surface]),
                `${name} on ${surface}`
            ).toBeGreaterThanOrEqual(min);
    });

    it('the initial reads on a generated avatar of any hue (large text, 3:1)', () => {
        const s = percent(header, 'avatar-saturation');
        const l = percent(header, 'avatar-lightness');
        for (let hue = 0; hue < 360; hue++)
            expect(
                contrast(t['avatar-initial'], hsl(hue, s, l)),
                `hue ${hue}`
            ).toBeGreaterThanOrEqual(3);
    });

    // AA over the decorative pattern (brand moments: short text, headings);
    // AAA for body text stays the rule on plain surfaces.
    it('text keeps its contrast over the brand pattern', () => {
        const start = tokens.indexOf(header);
        const block = tokens.slice(start, tokens.indexOf('\n}', start));
        const opacity = Number(
            block.match(/--pattern-opacity:\s*([0-9.]+);/)?.[1]
        );
        // The pattern's colour laid over a surface at its opacity.
        const over = (surface: string) => {
            const channel = (hex: string, i: number) =>
                parseInt(hex.slice(i, i + 2), 16);
            return `#${[1, 3, 5]
                .map((i) =>
                    Math.round(
                        channel(t[surface], i) +
                            (channel(t['pattern-color'], i) -
                                channel(t[surface], i)) *
                                opacity
                    )
                        .toString(16)
                        .padStart(2, '0')
                )
                .join('')}`;
        };
        expect(opacity).toBeGreaterThan(0);
        for (const surface of ['bg', 'surface'])
            for (const [name, min] of [
                ['text', 4.5],
                ['text-muted', 4.5],
                ['link', 4.5],
            ] as const)
                expect(
                    contrast(t[name], over(surface)),
                    `${name} over the pattern on ${surface}`
                ).toBeGreaterThanOrEqual(min);
    });

    it('the navigation reads on its own surface', () => {
        for (const [name, min] of [
            ['text', 7],
            ['text-muted', 4.5],
            ['accent', 3],
        ] as const)
            expect(
                contrast(t[name], t['nav-surface']),
                `${name} on the navigation`
            ).toBeGreaterThanOrEqual(min);
    });

    it('a hovered menu item stays readable', () => {
        for (const [name, min] of [
            ['text', 7],
            ['text-muted', 4.5],
            ['accent', 3],
        ] as const)
            expect(
                contrast(t[name], t.hover),
                `${name} on hover`
            ).toBeGreaterThanOrEqual(min);
    });

    it('button text reads on the button, and the button on the navy hover', () => {
        expect(contrast(t['on-primary'], t.primary)).toBeGreaterThanOrEqual(7);
        expect(contrast(t['on-danger'], t.danger)).toBeGreaterThanOrEqual(4.5);
    });
});

describe('contrast', () => {
    it('matches WCAG', () => {
        expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
        expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    });
});
