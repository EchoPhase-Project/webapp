import { createRenderEffect } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useNav } from '@lib/nav';
import { useRootMeta } from '@lib/root';
import { useAuth } from '@lib/api';
import { AiOutlineInfoCircle } from 'solid-icons/ai';
import { TbOutlineBuildingEstate } from 'solid-icons/tb';
import { VsSettings } from 'solid-icons/vs';
import { useI18n, useLocalizer } from '@lib/i18n';

export default function HomePage() {
    const { setTitle, setDescription } = useRootMeta();
    const { setNavLinks } = useNav();
    const { logout } = useAuth();
    const { t } = useI18n();
    const page = useLocalizer('home');

    const navigate = useNavigate();

    createRenderEffect(() => {
        setTitle(`${page('title', 'Home')} · EchoPhase`);
        setDescription(
            page(
                'description',
                'Secure API bridge and real-time communication platform for modern distributed applications.'
            )
        );
        setNavLinks([
            {
                icon: TbOutlineBuildingEstate,
                text: t('nav.home', 'Home'),
                events: {
                    onClick: () => navigate('/'),
                },
            },
            {
                icon: AiOutlineInfoCircle,
                text: t('nav.about', 'About'),
                events: {
                    onClick: () => navigate('/about'),
                },
            },
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
                icon: AiOutlineInfoCircle,
                text: t('nav.logout', 'Logout'),
                events: {
                    onClick: () => logout(),
                },
            },
        ]);
    });

    return (
        <div>
            <h1>{page('heading', 'Home page')}</h1>
        </div>
    );
}
