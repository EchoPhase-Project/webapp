// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { MemoryRouter, Route } from '@solidjs/router';
import { I18nProvider } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import { expectNoA11yViolations } from '@shared/testing/axe';
import { SkeletonScope } from '@shared/ui/Skeleton';
import PageHeader from './PageHeader';

describe('PageHeader', () => {
    it('is the page’s h1 with its description, a "Read more" link and its action', async () => {
        render(() => (
            <I18nProvider>
                <MemoryRouter>
                    <Route
                        path="*"
                        component={() => (
                            <PageHeader
                                eyebrow="Workspace"
                                title="Notes"
                                description="Notes in Markdown."
                                docs="notes"
                                actions={<Button>New note</Button>}
                            />
                        )}
                    />
                </MemoryRouter>
            </I18nProvider>
        ));
        expect(
            await screen.findByRole('heading', { level: 1, name: 'Notes' })
        ).toBeTruthy();
        expect(
            screen.getByRole('link', { name: 'Read more' }).getAttribute('href')
        ).toBe('/docs/notes');
        expect(screen.getByRole('button', { name: 'New note' })).toBeTruthy();
        await expectNoA11yViolations();
    });

    it('keeps a real h1 in its loading form, with bars for what is empty', async () => {
        const { container } = render(() => (
            <I18nProvider>
                <SkeletonScope when>
                    <PageHeader
                        title="Sessions"
                        actions={<Button>Revoke all</Button>}
                    />
                    <PageHeader title="" />
                </SkeletonScope>
            </I18nProvider>
        ));
        const [named, empty] = screen.getAllByRole('heading', {
            level: 1,
            hidden: true,
        });
        expect(named.textContent).toBe('Sessions');
        expect(empty.querySelector('.skeleton-text')).not.toBeNull();
        // The description and the eyebrow as bars; the actions keep their room.
        expect(
            container.querySelectorAll('.page-description .skeleton-line')
        ).toHaveLength(4);
        expect(
            container.querySelectorAll('.page-eyebrow .skeleton-text')
        ).toHaveLength(2);
        expect(
            container.querySelector('.page-actions--loading')
        ).not.toBeNull();
        await expectNoA11yViolations();
    });
});
