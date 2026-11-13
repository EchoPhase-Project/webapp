// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import HeaderButton from './HeaderButton';

describe('HeaderButton', () => {
    afterEach(cleanup);

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
