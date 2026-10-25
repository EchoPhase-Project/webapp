import { useNavigate } from '@solidjs/router';
import { AiOutlineLogin, AiOutlineLogout } from 'solid-icons/ai';
import { useAuth } from '@shared/api/auth-provider';
import { useI18n } from '@shared/i18n/i18n-context';
import type { NavLink, NavSubItem } from '@shared/nav/nav-link';
import BrandTile from '@shared/ui/BrandTile';
import { NAV_GROUPS, PAGES, type NavGroup, type Page } from './pages';

/**
 * The app's navigation, the same on every page: the pages of the registry
 * that have a `nav` (those needing a session only once there is one), each
 * group as one entry with a sub-menu where its first page stands. Home
 * first; sign-in only when signed out, sign-out last (neither while the
 * user is loading). About and the policies are in the footer.
 */
export function useNavLinks(): () => NavLink[] {
    const navigate = useNavigate();
    const { logout, isAuthenticated, user } = useAuth();
    const { t } = useI18n();

    const go = (page: Page) => ({ onClick: () => navigate(page.path) });

    const subItem = (page: Page): NavSubItem => ({
        icon: page.nav!.icon,
        label: t(page.nav!.key, page.nav!.text),
        description:
            page.nav!.description &&
            t(page.nav!.description.key, page.nav!.description.text),
        events: go(page),
    });

    const pageLinks = (): NavLink[] => {
        const visible = PAGES.filter(
            (page) => page.nav && (!page.auth || isAuthenticated())
        );
        const links: NavLink[] = [];
        const groups = new Map<NavGroup, NavLink>();
        for (const page of visible) {
            const nav = page.nav!;
            if (!nav.group) {
                links.push({
                    icon: nav.icon,
                    text: t(nav.key, nav.text),
                    events: go(page),
                });
                continue;
            }
            let group = groups.get(nav.group);
            if (!group) {
                const own = NAV_GROUPS[nav.group];
                group = {
                    icon: own.icon,
                    text: t(own.key, own.text),
                    items: [],
                };
                groups.set(nav.group, group);
                links.push(group);
            }
            group.items!.push(subItem(page));
        }
        return links;
    };

    return () => [
        {
            icon: BrandTile,
            text: t('nav.home', 'Home'),
            events: { onClick: () => navigate('/') },
        },
        ...pageLinks(),
        ...(isAuthenticated()
            ? [
                  {
                      icon: AiOutlineLogout,
                      text: t('nav.logout', 'Log out'),
                      events: { onClick: () => void logout() },
                  },
              ]
            : []),
        ...(user() === null
            ? [
                  {
                      icon: AiOutlineLogin,
                      text: t('nav.login', 'Log in'),
                      events: { onClick: () => navigate('/auth') },
                  },
              ]
            : []),
    ];
}
