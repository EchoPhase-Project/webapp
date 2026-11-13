// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@solidjs/testing-library';
import { renderPage } from '@shared/testing/render-page';
import { ThemeProvider } from '@shared/theme/theme-context';
import { ThemeToggle } from '@shared/theme/ThemeToggle';
import { LanguageDropdown } from './LanguageDropdown';

describe('header buttons', () => {
    it('say on hover what they do, as notes and notifications do', async () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => ({
                matches: false,
                addEventListener: () => {},
                removeEventListener: () => {},
            }))
        );
        renderPage(() => (
            <ThemeProvider>
                <ThemeToggle />
                <LanguageDropdown />
            </ThemeProvider>
        ));

        const theme = screen.getByRole('button', {
            name: 'Switch to dark theme',
        });
        expect(theme.getAttribute('title')).toBe('Switch to dark theme');
        const language = await screen.findByRole('button', {
            name: 'Select language',
        });
        expect(language.getAttribute('title')).toMatch(/^Select language: \S+/);
    });
});
