// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@solidjs/testing-library';
import { MemoryRouter, Route } from '@solidjs/router';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { expectNoA11yViolations } from '@shared/testing/axe';
import PageSkeleton, { type PageSkeletonForm } from './PageSkeleton';

function renderForm(form: PageSkeletonForm) {
    return render(() => (
        <I18nProvider>
            <MemoryRouter>
                <Route
                    path="*"
                    component={() => <PageSkeleton form={form} />}
                />
            </MemoryRouter>
        </I18nProvider>
    ));
}

// What each form has besides the header.
const parts: [PageSkeletonForm, string, number][] = [
    ['header', '.card, table', 0],
    ['table', 'tbody tr', 4],
    ['cards', '.page-skeleton-cards .card', 6],
    ['list', '.card', 4],
    ['settings', '.settings-card', 2],
    ['detail', '.card', 1],
    ['document', '.page-skeleton-document .skeleton-text', 3],
];

describe('PageSkeleton', () => {
    it.each(parts)(
        'the %s form: a header and its parts, hidden and silent',
        async (form, selector, count) => {
            const { container } = renderForm(form);
            await Promise.resolve();
            const scope =
                container.querySelector<HTMLElement>('.skeleton-scope');
            expect(scope?.getAttribute('aria-hidden')).toBe('true');
            expect(scope?.inert).toBe(true);
            expect(scope?.querySelector('h1 .skeleton-text')).not.toBeNull();
            expect(container.querySelectorAll(selector)).toHaveLength(count);
            // The layout's live region speaks for it.
            expect(container.querySelector('[role="status"]')).toBeNull();
            await expectNoA11yViolations();
        }
    );
});
