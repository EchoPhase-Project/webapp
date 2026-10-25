/**
 * A soft gradient of its own for every user who has no picture: two or
 * three hues spread apart on the wheel (so they never mix into mud), where
 * they blend from and at what angle, all from a hash of the user's id. The
 * same id always gives the same gradient; saturation and lightness come
 * from the theme (--avatar-saturation, --avatar-lightness).
 */
export interface AvatarGradient {
    /** Hues in degrees: the base, then two more around the wheel. */
    hues: [number, number, number];
    /** The angle of the base blend, in degrees. */
    angle: number;
    /** Where the two highlights sit, in % of the side. */
    spots: [[number, number], [number, number]];
}

// FNV-1a, 32 bits: small, fast, spreads short strings well.
function fnv1a(text: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

// Several numbers from one seed: each step re-hashes the last.
function* numbers(seed: string): Generator<number> {
    let value = fnv1a(seed);
    for (;;) {
        yield value;
        value = fnv1a(`${value}:${seed}`);
    }
}

export function avatarGradient(seed: string): AvatarGradient {
    const next = numbers(seed || '?');
    const pick = (range: number) => next.next().value % range;
    const base = pick(360);
    // 70-130 and 180-240 degrees on: two neighbours apart, a third across.
    const second = (base + 70 + pick(60)) % 360;
    const third = (base + 180 + pick(60)) % 360;
    return {
        hues: [base, second, third],
        angle: pick(360),
        spots: [
            [10 + pick(30), 5 + pick(30)],
            [60 + pick(30), 60 + pick(30)],
        ],
    };
}

/**
 * The gradient as a CSS background (colours from the theme's tokens),
 * blended in OKLab: hues far apart meet in clean in-between colours instead
 * of the grey-brown an sRGB blend gives.
 */
export function avatarBackground(seed: string): string {
    const { hues, angle, spots } = avatarGradient(seed);
    const colour = (hue: number) =>
        `hsl(${hue} var(--avatar-saturation) var(--avatar-lightness))`;
    return [
        `radial-gradient(circle at ${spots[0][0]}% ${spots[0][1]}% in oklab, ${colour(hues[1])} 0%, transparent 55%)`,
        `radial-gradient(circle at ${spots[1][0]}% ${spots[1][1]}% in oklab, ${colour(hues[2])} 0%, transparent 60%)`,
        `linear-gradient(${angle}deg in oklch, ${colour(hues[0])}, ${colour(hues[1])})`,
    ].join(', ');
}
