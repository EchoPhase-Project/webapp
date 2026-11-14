// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import SettingsCard from './SettingsCard';

describe('SettingsCard', () => {
    it('is a section with its title, description and content, and no footer', () => {
        const { container } = render(() => (
            <SettingsCard title="Details" description="What others see.">
                <p>Body</p>
            </SettingsCard>
        ));
        const card = container.firstElementChild!;
        expect(card.tagName).toBe('SECTION');
        expect(screen.getByRole('heading', { name: 'Details' })).toBeTruthy();
        expect(screen.getByText('What others see.')).toBeTruthy();
        expect(screen.getByText('Body')).toBeTruthy();
        expect(container.querySelector('.settings-card-footer')).toBeNull();
    });

    it('is a form when it submits, its action in the footer', () => {
        const onSubmit = vi.fn((e: SubmitEvent) => e.preventDefault());
        const { container } = render(() => (
            <SettingsCard
                title="Delete"
                danger
                hint="It cannot be undone."
                onSubmit={onSubmit}
                actions={<button type="submit">Go</button>}
            />
        ));
        const card = container.firstElementChild!;
        expect(card.tagName).toBe('FORM');
        expect(card.classList.contains('settings-card--danger')).toBe(true);
        expect(
            container.querySelector('.settings-card-hint')!.textContent
        ).toBe('It cannot be undone.');
        fireEvent.click(screen.getByRole('button', { name: 'Go' }));
        expect(onSubmit).toHaveBeenCalledOnce();
    });
});
