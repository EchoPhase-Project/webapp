import { useNavigate } from '@solidjs/router';
import { AiOutlineLogin, AiOutlineLogout } from 'solid-icons/ai';
import { VsSettings } from 'solid-icons/vs';
import { useAuth } from '@shared/api/auth-provider';
import { useI18n } from '@shared/i18n/i18n-context';
import type { NavLink } from '@shared/nav/nav-link';
import BrandTile from '@shared/ui/BrandTile';

/**
 * The app's navigation, the same on every page: what needs a session only
 * once there is one, sign-in only when there is none (neither while the
 * user is loading). About and the policies are in the footer.
 */
export function useNavLinks(): () => NavLink[] {
    const navigate = useNavigate();
    const { logout, isAuthenticated, user } = useAuth();
    const { t } = useI18n();

    const signedIn = (): NavLink[] => [
        {
            icon: VsSettings,
            text: t('nav.settings', 'Settings'),
            items: [
                {
                    icon: VsSettings,
                    label: t('nav.sessions.label', 'Sessions'),
                    description: t(
                        'nav.sessions.description',
                        'View active sessions'
                    ),
                    events: { onClick: () => navigate('/sessions') },
                },
                {
                    icon: VsSettings,
                    label: t('nav.api_clients.label', 'API clients'),
                    description: t(
                        'nav.api_clients.description',
                        'Credentials for bots and scripts'
                    ),
                    events: { onClick: () => navigate('/api-clients') },
                },
            ],
        },
        {
            icon: AiOutlineLogout,
            text: t('nav.logout', 'Log out'),
            events: { onClick: () => void logout() },
        },
    ];

    return () => [
        {
            icon: BrandTile,
            text: t('nav.home', 'Home'),
            events: { onClick: () => navigate('/') },
        },
        ...(isAuthenticated() ? signedIn() : []),
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
