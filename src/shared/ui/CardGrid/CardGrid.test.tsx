// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { SkeletonScope } from '@shared/ui/Skeleton';
import Card from '@shared/ui/Card';
import { expectNoA11yViolations } from '@shared/testing/axe';
import CardGrid from './CardGrid';

describe('CardGrid', () => {
    it('lays its cards out in a grid of its size, as a list when asked', async () => {
        const { container } = render(() => (
            <CardGrid as="ul" size="medium" class="extra">
                <li>
                    <Card>One</Card>
                </li>
                <li>
                    <Card>Two</Card>
                </li>
            </CardGrid>
        ));
        const grid = container.querySelector('ul.card-grid');
        expect([...(grid?.classList ?? [])]).toEqual([
            'card-grid',
            'card-grid--medium',
            'extra',
        ]);
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        await expectNoA11yViolations();
    });

    it('stretches few cards over the row only when asked', () => {
        const { container } = render(() => (
            <>
                <CardGrid>
                    <Card>A</Card>
                </CardGrid>
                <CardGrid stretch>
                    <Card>B</Card>
                </CardGrid>
            </>
        ));
        const [plain, stretched] = container.querySelectorAll('.card-grid');
        expect(plain?.classList.contains('card-grid--small')).toBe(true);
        expect(plain?.classList.contains('card-grid--stretch')).toBe(false);
        expect(stretched?.classList.contains('card-grid--stretch')).toBe(true);
    });

    it('shows empty cards in place of its children while it loads', async () => {
        const { container } = render(() => (
            <I18nProvider>
                <SkeletonScope when>
                    <CardGrid as="ul" skeletonCards={3}>
                        <li>
                            <Card>Real</Card>
                        </li>
                    </CardGrid>
                </SkeletonScope>
            </I18nProvider>
        ));
        expect(
            container.querySelectorAll('.card-grid > li > .card')
        ).toHaveLength(3);
        expect(container.textContent).not.toContain('Real');
        await expectNoA11yViolations();
    });
});
