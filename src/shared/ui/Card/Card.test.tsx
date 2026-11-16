// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { SkeletonScope } from '@shared/ui/Skeleton';
import { expectNoA11yViolations } from '@shared/testing/axe';
import Card from './Card';

describe('Card', () => {
    it('is a surface with its content and the class of the caller', async () => {
        const { container } = render(() => (
            <Card class="notice" patterned>
                <p>A notice.</p>
            </Card>
        ));
        const card = container.querySelector('.card');
        expect(card?.classList.contains('notice')).toBe(true);
        expect(card?.classList.contains('patterned')).toBe(true);
        expect(screen.getByText('A notice.')).toBeTruthy();
        await expectNoA11yViolations();
    });

    it('keeps its frame and shows bars in place of its content while it loads', async () => {
        const { container } = render(() => (
            <I18nProvider>
                <SkeletonScope when>
                    <Card skeletonLines={4}>
                        <p>A notice.</p>
                    </Card>
                </SkeletonScope>
            </I18nProvider>
        ));
        expect(screen.queryByText('A notice.')).toBeNull();
        expect(container.querySelectorAll('.card .skeleton-line')).toHaveLength(
            4
        );
        await expectNoA11yViolations();
    });
});
