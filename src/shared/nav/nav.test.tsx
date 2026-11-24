// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@solidjs/testing-library';
import { IconCompass, IconFolder, IconNotes, IconUser } from '@shared/ui/icons';
import { renderPage } from '@shared/testing/render-page';
import { expectNoA11yViolations } from '@shared/testing/axe';
import type { NavModel } from './nav-link';
import { DesktopNav } from './desktop-nav';
import { MobileNav } from './mobile-nav';

const Home = () => <span>logo</span>;

const model = (over: Partial<NavModel> = {}): NavModel => ({
    home: { icon: Home, label: 'Home', href: '/' },
    sections: [
        { icon: IconCompass, label: 'Explore', href: '/explore' },
        {
            icon: IconNotes,
            label: 'Workspace',
            items: [
                { icon: IconNotes, label: 'Notes', href: '/notes' },
                { icon: IconFolder, label: 'Files', href: '/files' },
            ],
        },
    ],
    account: {
        id: 'u1',
        name: 'Dusty',
        userName: 'dusty',
        avatarFileId: null,
        items: [
            { icon: IconUser, label: 'Profile', href: '/profile' },
            { label: 'Log out', onSelect: logout },
        ],
    },
    ...over,
});

const logout = vi.fn();

describe('DesktopNav', () => {
    afterEach(() => {
        cleanup();
        logout.mockReset();
    });

    it('leaves home to the bar; pages are real links, a group a button', () => {
        renderPage(() => <DesktopNav nav={model()} />);

        // The logo is in the app's bar, over the rail: not in the rail.
        expect(screen.queryByRole('link', { name: /Home/ })).toBeNull();
        expect(screen.queryByText('logo')).toBeNull();
        expect(
            screen.getByRole('link', { name: 'Explore' }).getAttribute('href')
        ).toBe('/explore');
        const group = screen.getByRole('button', { name: 'Workspace' });
        expect(group.getAttribute('aria-expanded')).toBe('false');
    });

    it('opens a group’s list beside the rail, and closes it on Escape', () => {
        renderPage(() => <DesktopNav nav={model()} />);

        fireEvent.click(screen.getByRole('button', { name: 'Workspace' }));

        expect(
            screen
                .getByRole('button', { name: 'Workspace' })
                .getAttribute('aria-expanded')
        ).toBe('true');
        expect(
            screen.getByRole('link', { name: /Files/ }).getAttribute('href')
        ).toBe('/files');
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('link', { name: /Files/ })).toBeNull();
    });

    it('closes a list on a press outside it, and on its button', async () => {
        renderPage(() => <DesktopNav nav={model()} />);
        const group = screen.getByRole('button', { name: 'Workspace' });

        fireEvent.click(group);
        await expectNoA11yViolations();
        fireEvent.pointerDown(document.body);
        expect(screen.queryByRole('link', { name: /Files/ })).toBeNull();
        expect(group.getAttribute('aria-expanded')).toBe('false');

        fireEvent.click(group);
        fireEvent.pointerDown(group);
        fireEvent.click(group);
        expect(screen.queryByRole('link', { name: /Files/ })).toBeNull();
    });

    it('opens a list in the top layer, right of the rail, level with its button', () => {
        const proto = HTMLElement.prototype as unknown as {
            showPopover?: () => void;
            hidePopover?: () => void;
        };
        const show = vi.fn<() => void>();
        proto.showPopover = show;
        proto.hidePopover = vi.fn();
        vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
        vi.spyOn(
            HTMLElement.prototype,
            'getBoundingClientRect'
        ).mockImplementation(function (this: HTMLElement) {
            if (this.tagName === 'NAV')
                return { top: 0, bottom: 800, left: 0, right: 64 } as DOMRect;
            if (this.classList.contains('nav-flyout'))
                return { top: 0, bottom: 120, height: 120 } as DOMRect;
            return {
                top: 200,
                bottom: 240,
                left: 0,
                right: 64,
                width: 64,
            } as DOMRect;
        });
        try {
            renderPage(() => <DesktopNav nav={model()} />);
            fireEvent.click(screen.getByRole('button', { name: 'Workspace' }));
            const flyout = document.querySelector<HTMLElement>('.nav-flyout');
            expect(flyout?.getAttribute('popover')).toBe('auto');
            expect(show.mock.contexts[0]).toBe(flyout);
            expect(flyout?.style.left).toBe('72px');
            expect(flyout?.style.top).toBe('194px');

            // Another list opens with the press that closed the first.
            const account = screen.getByRole('button', { name: /Dusty/ });
            fireEvent.pointerDown(account);
            fireEvent.click(account);
            const closed = new Event('toggle');
            Object.defineProperty(closed, 'newState', { value: 'closed' });
            flyout?.dispatchEvent(closed);
            expect(account.getAttribute('aria-expanded')).toBe('true');
            expect(
                screen
                    .getByRole('button', { name: 'Workspace' })
                    .getAttribute('aria-expanded')
            ).toBe('false');
        } finally {
            delete proto.showPopover;
            delete proto.hidePopover;
            vi.restoreAllMocks();
        }
    });

    it('keeps the account at the bottom: name, @username, its pages and signing out', () => {
        renderPage(() => <DesktopNav nav={model()} />);

        const account = screen.getByRole('button', { name: /Dusty/ });
        expect(account.textContent).toContain('@dusty');
        fireEvent.click(account);
        expect(screen.getByRole('link', { name: /Profile/ })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
        expect(logout).toHaveBeenCalledOnce();
    });

    it('marks a group as current while one of its pages is open, and the account for its pages', () => {
        renderPage(() => <DesktopNav nav={model()} />, '/files');

        expect(
            screen
                .getByRole('button', { name: 'Workspace' })
                .classList.contains('nav-current')
        ).toBe(true);
        expect(
            screen
                .getByRole('button', { name: /Dusty/ })
                .classList.contains('nav-current')
        ).toBe(false);
        cleanup();

        renderPage(() => <DesktopNav nav={model()} />, '/profile');
        expect(
            screen
                .getByRole('button', { name: /Dusty/ })
                .classList.contains('nav-current')
        ).toBe(true);
        expect(
            screen
                .getByRole('button', { name: 'Workspace' })
                .classList.contains('nav-current')
        ).toBe(false);
    });
});

describe('DesktopNav, empty', () => {
    it('marks a rail with nothing in it, so it does not widen', () => {
        renderPage(() => (
            <DesktopNav nav={model({ sections: [], account: null })} />
        ));
        const rail = screen.getByRole('navigation');
        expect(rail.classList.contains('navbar--empty')).toBe(true);
    });

    it('does not mark one with pages in it', () => {
        renderPage(() => <DesktopNav nav={model({ account: null })} />);
        expect(
            screen.getByRole('navigation').classList.contains('navbar--empty')
        ).toBe(false);
    });
});

describe('MobileNav', () => {
    afterEach(() => cleanup());

    it('puts the first pages on the bar, everything behind More', () => {
        renderPage(() => <MobileNav nav={model()} />);

        const bar = screen.getByRole('navigation');
        expect(
            [...bar.querySelectorAll('a')].map((a) => a.getAttribute('href'))
        ).toEqual(['/', '/explore', '/notes']);
        expect(
            screen
                .getByRole('button', { name: 'More' })
                .getAttribute('aria-expanded')
        ).toBe('false');
    });

    it('opens the drawer with groups that expand downward, the account at the bottom', () => {
        renderPage(() => <MobileNav nav={model()} />);

        fireEvent.click(screen.getByRole('button', { name: 'More' }));
        const group = screen.getByRole('button', { name: 'Workspace' });
        const list = document.getElementById(
            group.getAttribute('aria-controls') ?? ''
        );

        expect(list?.hidden).toBe(true);
        fireEvent.click(group);
        expect(group.getAttribute('aria-expanded')).toBe('true');
        expect(list?.hidden).toBe(false);
        expect(
            screen.getByRole('button', { name: /Dusty/ }).textContent
        ).toContain('@dusty');
    });

    it('marks More and the page’s group as current for a page only the drawer leads to', () => {
        renderPage(() => <MobileNav nav={model()} />, '/files');

        expect(
            screen
                .getByRole('button', { name: 'More' })
                .classList.contains('nav-current')
        ).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'More' }));
        expect(
            screen
                .getByRole('button', { name: 'Workspace' })
                .classList.contains('nav-current')
        ).toBe(true);
    });

    it('leaves More alone for a page on the bar', () => {
        renderPage(() => <MobileNav nav={model()} />, '/notes');

        expect(
            screen
                .getByRole('button', { name: 'More' })
                .classList.contains('nav-current')
        ).toBe(false);
    });

    it('has no bar while signed out', () => {
        renderPage(() => <MobileNav nav={model({ account: null })} />);

        expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
    });
});
