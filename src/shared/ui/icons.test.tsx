// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@solidjs/testing-library';
import { IconLock, IconX } from './icons';

describe('icons', () => {
    it('are hidden from screen readers by default', () => {
        const { container } = render(() => <IconLock class="x" size={16} />);
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('aria-hidden')).toBe('true');
        expect(svg?.getAttribute('class')).toContain('x');
        expect(svg?.getAttribute('width')).toBe('16');
    });

    it('keep a name the caller gives them', () => {
        const { container } = render(() => (
            <>
                <IconLock aria-label="Private" />
                <IconX title="Close" />
            </>
        ));
        const [lock, x] = container.querySelectorAll('svg');
        expect(lock?.hasAttribute('aria-hidden')).toBe(false);
        expect(lock?.getAttribute('aria-label')).toBe('Private');
        expect(x?.hasAttribute('aria-hidden')).toBe(false);
        expect(x?.querySelector('title')?.textContent).toBe('Close');
    });

    it('keep an aria-hidden the caller sets', () => {
        const { container } = render(() => <IconLock aria-hidden="false" />);
        expect(
            container.querySelector('svg')?.getAttribute('aria-hidden')
        ).toBe('false');
    });
});
