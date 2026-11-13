// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import HeaderButton from './HeaderButton';

describe('HeaderButton', () => {
    it('is named by its label, says it on hover, and does not submit', () => {
        const onClick = vi.fn();
        render(() => (
            <form>
                <HeaderButton label="New note" class="extra" onClick={onClick}>
                    <svg />
                </HeaderButton>
            </form>
        ));
        const button = screen.getByRole('button', { name: 'New note' });

        expect(button.getAttribute('title')).toBe('New note');
        expect(button.getAttribute('type')).toBe('button');
        expect(button.classList.contains('header-button')).toBe(true);
        expect(button.classList.contains('extra')).toBe(true);
        fireEvent.click(button);
        expect(onClick).toHaveBeenCalledOnce();
    });
});
