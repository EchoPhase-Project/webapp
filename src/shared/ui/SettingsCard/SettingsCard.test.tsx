// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { expectNoA11yViolations } from '@shared/testing/axe';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { SkeletonScope } from '@shared/ui/Skeleton';
import SettingsCard from './SettingsCard';

describe('SettingsCard', () => {
    it('is a section with its title, description and content, and no footer', async () => {
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
        await expectNoA11yViolations();
    });

    it('is a form when it submits, its action in the footer', async () => {
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
        await expectNoA11yViolations();
    });

    it('keeps its frame and title while it loads, bars for the rest', async () => {
        const { container } = render(() => (
            <I18nProvider>
                <SkeletonScope when>
                    <SettingsCard
                        title="Details"
                        description="What others see."
                        actions={<button type="button">Save</button>}
                    >
                        <p>Body</p>
                    </SettingsCard>
                </SkeletonScope>
            </I18nProvider>
        ));
        expect(
            screen.getByRole('heading', { name: 'Details', hidden: true })
        ).toBeTruthy();
        expect(screen.queryByText('Body')).toBeNull();
        expect(screen.queryByText('What others see.')).toBeNull();
        expect(
            container.querySelectorAll('.settings-card-body .skeleton-text')
        ).toHaveLength(2);
        expect(
            container.querySelector('.settings-card-actions--loading')
        ).not.toBeNull();
        await expectNoA11yViolations();
    });
});
