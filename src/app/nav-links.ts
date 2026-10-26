import { AiOutlineLogin, AiOutlineLogout } from 'solid-icons/ai';
import { useAuth } from '@shared/api/auth-provider';
import { useI18n } from '@shared/i18n/i18n-context';
import type { NavItem, NavModel, NavSection } from '@shared/nav/nav-link';
import { pageSection } from '@shared/nav/page-section';
import BrandTile from '@shared/ui/BrandTile';
import { NAV_GROUPS, PAGES, type NavGroup, type Page } from './pages';

/** Pages of this group go into the account menu at the bottom, not the middle. */
const ACCOUNT_GROUP: NavGroup = 'settings';

/**
 * The app's navigation: home on top; the pages of the registry that have
 * a `nav` in the middle (those needing a session only once there is one),
 * a group as one section with its pages, and the shown page's own group
 * (a package's) after the section it belongs to; at the bottom the account
 * (its settings pages and signing out) or signing in. About and the
 * policies are in the footer.
 */
export function useNav(): () => NavModel {
    const { logout, isAuthenticated, user } = useAuth();
    const { t } = useI18n();

    const item = (page: Page): NavItem => {
        const nav = page.nav!;
        return {
            icon: nav.icon,
            label: t(nav.key, nav.text),
            description:
                nav.description && t(nav.description.key, nav.description.text),
            href: page.path,
        };
    };

    const build = (): NavModel => {
        const visible = PAGES.filter(
            (page) => page.nav && (!page.auth || isAuthenticated())
        );
        const sections: NavSection[] = [];
        const groups = new Map<NavGroup, NavSection>();
        const accountItems: NavItem[] = [];
        for (const page of visible) {
            const nav = page.nav!;
            if (nav.group === ACCOUNT_GROUP) {
                accountItems.push(item(page));
                continue;
            }
            if (!nav.group) {
                sections.push({
                    icon: nav.icon,
                    label: t(nav.key, nav.text),
                    href: page.path,
                });
                continue;
            }
            let group = groups.get(nav.group);
            if (!group) {
                const own = NAV_GROUPS[nav.group];
                group = {
                    icon: own.icon,
                    label: t(own.key, own.text),
                    items: [],
                };
                groups.set(nav.group, group);
                sections.push(group);
            }
            group.items!.push(item(page));
        }

        // The page's own groups (a package's, a workflow's), after the section they belong to.
        const extra = pageSection();
        if (extra) {
            const at = sections.findIndex((s) => s.href === extra.after);
            sections.splice(
                at < 0 ? sections.length : at + 1,
                0,
                ...extra.sections
            );
        }

        const me = user();
        return {
            home: { icon: BrandTile, label: t('nav.home', 'Home'), href: '/' },
            sections,
            account:
                me && isAuthenticated()
                    ? {
                          id: me.id,
                          name: me.name,
                          userName: me.userName,
                          avatarFileId: me.avatarFileId,
                          items: [
                              ...accountItems,
                              {
                                  icon: AiOutlineLogout,
                                  label: t('nav.logout', 'Log out'),
                                  onSelect: () => void logout(),
                              },
                          ],
                      }
                    : null,
            login:
                me === null
                    ? {
                          icon: AiOutlineLogin,
                          label: t('nav.login', 'Log in'),
                          href: '/auth',
                      }
                    : null,
        };
    };

    return build;
}
