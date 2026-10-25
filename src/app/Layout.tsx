import { Component, onCleanup, Show } from 'solid-js';
import type { ParentProps } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { NavBuilder } from '@shared/nav/nav-builder';
import { Header } from '@shared/ui/Header';
import RealtimeNotices from '@features/realtime/RealtimeNotices';
import { useRealtime } from '@features/realtime/realtime-provider';
import NotificationBell from '@features/notifications/NotificationBell';
import QuickNoteButton from '@features/notes/QuickNoteButton';
import { notesChanged } from '@features/notes/notes-changes';
import { useAuth } from '@shared/api/auth-provider';
import { useI18n } from '@shared/i18n/i18n-context';
import MaintenanceScreen from '@features/maintenance/MaintenanceScreen';
import ConsentBanner from '@features/consent/ConsentBanner';
import ConsentSettings from '@features/consent/ConsentSettings';
import { useNav } from './nav-links';
import Footer from './Footer';
import '@shared/styles/global.scss';

const Layout: Component<ParentProps> = (props) => {
    const nav = useNav();
    const realtime = useRealtime();
    const { isAuthenticated, user } = useAuth();
    const { t } = useI18n();
    // A note shared with the user shows up in an open list at once.
    onCleanup(
        realtime.subscribe('notification.created', (event) => {
            const kind = (event.notification as { kind?: string } | undefined)
                ?.kind;
            if (kind === 'note_shared') notesChanged();
        })
    );
    const location = useLocation();
    // The sign-in page stands alone: nowhere to go before signing in.
    const showNav = () => location.pathname !== '/auth';

    return (
        <div class="container">
            <Show when={showNav()}>
                <NavBuilder nav={nav()} />
            </Show>

            <Header
                actions={
                    <>
                        <Show when={isAuthenticated()}>
                            <QuickNoteButton />
                            <NotificationBell feed={realtime} />
                        </Show>
                        {/* Phones have no bar while signed out: signing in is here. */}
                        <Show when={user() === null && showNav()}>
                            <A href="/auth" class="header-button header-login">
                                {t('nav.login', 'Log in')}
                            </A>
                        </Show>
                    </>
                }
            />

            <main>{props.children}</main>

            <Footer />

            <RealtimeNotices />

            <ConsentBanner />
            <ConsentSettings />

            <MaintenanceScreen />
        </div>
    );
};

export default Layout;
