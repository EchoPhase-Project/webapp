// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@solidjs/testing-library';
import {
    AiOutlineCompass,
    AiOutlineFolder,
    AiOutlineUser,
} from 'solid-icons/ai';
import { VsNote } from 'solid-icons/vs';
import { renderPage } from '@shared/testing/render-page';
import type { NavModel } from './nav-link';
import { DesktopNav } from './desktop-nav';
import { MobileNav } from './mobile-nav';

const Home = () => <span>logo</span>;

const model = (over: Partial<NavModel> = {}): NavModel => ({
    home: { icon: Home, label: 'Home', href: '/' },
    sections: [
        { icon: AiOutlineCompass, label: 'Explore', href: '/explore' },
        {
            icon: VsNote,
            label: 'Workspace',
            items: [
                { icon: VsNote, label: 'Notes', href: '/notes' },
                { icon: AiOutlineFolder, label: 'Files', href: '/files' },
            ],
        },
    ],
    account: {
        id: 'u1',
        name: 'Dusty',
        userName: 'dusty',
        avatarFileId: null,
        items: [
            { icon: AiOutlineUser, label: 'Profile', href: '/profile' },
            { label: 'Log out', onSelect: logout },
        ],
    },
    login: null,
    ...over,
});

const logout = vi.fn();

describe('DesktopNav', () => {
    afterEach(() => {
        cleanup();
        logout.mockReset();
    });

    it('has home on top, pages as real links, a group as a button', () => {
        renderPage(() => <DesktopNav nav={model()} />);

        expect(
            screen.getByRole('link', { name: /Home/ }).getAttribute('href')
        ).toBe('/');
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

    it('offers signing in when nobody is', () => {
        renderPage(() => (
            <DesktopNav
                nav={model({
                    account: null,
                    login: { label: 'Log in', href: '/auth' },
                })}
            />
        ));

        expect(
            screen.getByRole('link', { name: 'Log in' }).getAttribute('href')
        ).toBe('/auth');
        expect(screen.queryByRole('button', { name: /Dusty/ })).toBeNull();
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
