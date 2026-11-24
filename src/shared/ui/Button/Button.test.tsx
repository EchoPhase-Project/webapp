// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { MemoryRouter, Route } from '@solidjs/router';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { IconCopy } from '@shared/ui/icons';
import { expectNoA11yViolations } from '@shared/testing/axe';
import Button from './Button';
import LinkButton from './LinkButton';

describe('Button', () => {
    it('does not submit, says when it is busy, and an icon button takes its name', async () => {
        render(() => (
            <form>
                <Button busy>Save</Button>
                <Button variant="icon" aria-label="Copy the address">
                    <IconCopy />
                </Button>
            </form>
        ));
        const save = screen.getByRole<HTMLButtonElement>('button', {
            name: 'Save',
        });
        expect(save.type).toBe('button');
        expect(save.disabled).toBe(true);
        expect(save.getAttribute('aria-busy')).toBe('true');
        const copy = screen.getByRole('button', { name: 'Copy the address' });
        expect(copy.classList.contains('btn-icon')).toBe(true);
        await expectNoA11yViolations();
    });
});

describe('LinkButton', () => {
    it('is a link with the look of a Button of the same variant', async () => {
        render(() => (
            <I18nProvider>
                <MemoryRouter>
                    <Route
                        path="/"
                        component={() => (
                            <>
                                <LinkButton href="/explore" class="extra">
                                    Explore
                                </LinkButton>
                                <LinkButton
                                    variant="ghost"
                                    href="/x"
                                    download=""
                                >
                                    Export
                                </LinkButton>
                            </>
                        )}
                    />
                </MemoryRouter>
            </I18nProvider>
        ));
        const explore = await screen.findByRole('link', { name: 'Explore' });
        expect(explore.getAttribute('href')).toBe('/explore');
        // The router's <A> adds active / inactive of its own.
        expect([...explore.classList]).toEqual(
            expect.arrayContaining(['btn', 'extra'])
        );
        const exported = screen.getByRole('link', { name: 'Export' });
        expect([...exported.classList]).toEqual(
            expect.arrayContaining(['btn', 'btn-ghost'])
        );
        expect(exported.hasAttribute('download')).toBe(true);
        // A page of the app: no arrow, no rel.
        expect(explore.querySelector('.btn-external')).toBeNull();
        expect(explore.hasAttribute('rel')).toBe(false);
        await expectNoA11yViolations();
    });

    it('marks a link to another site with an arrow, and a new tab for screen readers', async () => {
        render(() => (
            <I18nProvider>
                <MemoryRouter>
                    <Route
                        path="/"
                        component={() => (
                            <LinkButton
                                variant="ghost"
                                href="https://github.com/EchoPhase-Project"
                                target="_blank"
                            >
                                Source code
                            </LinkButton>
                        )}
                    />
                </MemoryRouter>
            </I18nProvider>
        ));
        const link = await screen.findByRole('link', {
            name: 'Source code (opens in a new tab)',
        });
        expect(link.querySelector('.btn-external')).not.toBeNull();
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
        await expectNoA11yViolations();
    });
});
