// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@solidjs/testing-library';
import { expectNoA11yViolations } from '@shared/testing/axe';
import { renderPage } from '@shared/testing/render-page';
import { LanguageSelect } from './LanguageSelect';

// Every call of setLocale from the picker, passed on to the real one.
const setLocaleCalls = vi.hoisted(() => vi.fn<(locale: string) => void>());
vi.mock('@shared/i18n/i18n-context', async (importOriginal) => {
    const real =
        await importOriginal<typeof import('@shared/i18n/i18n-context')>();
    return {
        ...real,
        useI18n: () => {
            const ctx = real.useI18n();
            return {
                ...ctx,
                setLocale: (locale: string) => {
                    setLocaleCalls(locale);
                    ctx.setLocale(locale);
                },
            };
        },
    };
});

async function renderSelect() {
    renderPage(() => <LanguageSelect />);
    const button = await screen.findByRole('combobox', {
        name: /^Select language: /,
    });
    button.focus();
    return button;
}

describe('LanguageSelect', () => {
    beforeEach(() => {
        localStorage.clear();
        setLocaleCalls.mockClear();
        document.documentElement.lang = '';
    });

    it('names the selected language by its own name and its code', async () => {
        const button = await renderSelect();
        expect(button.getAttribute('aria-label')).toBe(
            'Select language: English (EN)'
        );
        expect(button.textContent).toContain('EN');
        expect(document.documentElement.lang).toBe('en');
        await expectNoA11yViolations();
    });

    it('lists the languages by their own names', async () => {
        const button = await renderSelect();
        fireEvent.click(button);
        // Each option is named by its native name and shows its code below.
        for (const [name, code] of [
            ['English', 'EN'],
            ['Română', 'RO'],
            ['Русский', 'RU'],
        ]) {
            const option = screen.getByRole('option', { name });
            expect(option.textContent).toContain(code);
        }
        await expectNoA11yViolations();
    });

    it('changes the language with the keyboard', async () => {
        const button = await renderSelect();
        fireEvent.keyDown(button, { key: 'Enter' });
        expect(button.getAttribute('aria-expanded')).toBe('true');
        // The options are in the order of the codes: en, ro, ru.
        fireEvent.keyDown(button, { key: 'ArrowDown' });
        fireEvent.keyDown(button, { key: 'Enter' });

        expect(setLocaleCalls).toHaveBeenCalledExactlyOnceWith('ro');
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(document.documentElement.lang).toBe('ro');
        expect(localStorage.getItem('app_locale')).toBe('ro');
        expect(button.getAttribute('aria-label')).toMatch(/: Română \(RO\)$/);
        expect(document.activeElement).toBe(button);
    });

    it('changes the language with the mouse', async () => {
        const button = await renderSelect();
        fireEvent.click(button);
        fireEvent.click(screen.getByRole('option', { name: 'Русский' }));

        expect(setLocaleCalls).toHaveBeenCalledExactlyOnceWith('ru');
        expect(document.documentElement.lang).toBe('ru');
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(button.getAttribute('aria-label')).toMatch(/: Русский \(RU\)$/);
    });

    it('does not set the language again when the current one is chosen', async () => {
        const button = await renderSelect();
        fireEvent.click(button);
        fireEvent.click(screen.getByRole('option', { name: 'English' }));
        fireEvent.keyDown(button, { key: 'Enter' });
        fireEvent.keyDown(button, { key: 'Enter' });

        expect(setLocaleCalls).not.toHaveBeenCalled();
        expect(document.documentElement.lang).toBe('en');
    });
});
