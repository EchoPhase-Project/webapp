// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { MemoryRouter, Route } from '@solidjs/router';
import { I18nProvider } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import { expectNoA11yViolations } from '@shared/testing/axe';
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
});
