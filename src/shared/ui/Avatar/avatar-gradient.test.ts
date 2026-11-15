import { describe, expect, it } from 'vitest';
import { avatarBackground, avatarGradient } from './avatar-gradient';

describe('avatarGradient', () => {
    it('is the same for the same id, and differs between ids', () => {
        expect(avatarGradient('u1')).toEqual(avatarGradient('u1'));
        const seen = new Set(
            Array.from({ length: 50 }, (_, i) =>
                avatarGradient(`user-${i}`).hues.join()
            )
        );
        expect(seen.size).toBeGreaterThan(45);
    });

    it('keeps its hues apart so they never mix into mud', () => {
        for (let i = 0; i < 200; i++) {
            const [a, b, c] = avatarGradient(`id-${i}`).hues;
            const apart = (x: number, y: number) =>
                Math.min(Math.abs(x - y), 360 - Math.abs(x - y));
            expect(apart(a, b)).toBeGreaterThanOrEqual(70);
            expect(apart(a, c)).toBeGreaterThanOrEqual(120);
        }
    });

    it('takes its colours from the theme', () => {
        expect(avatarBackground('u1')).toContain(
            'var(--avatar-saturation) var(--avatar-lightness)'
        );
    });
});
