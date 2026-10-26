import { Component, createEffect, on, onCleanup, Show } from 'solid-js';
import type { ParentProps } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { NavBuilder } from '@shared/nav/nav-builder';
import { Header } from '@shared/ui/Header';
import RealtimeNotices from '@features/realtime/RealtimeNotices';
import { useRealtime } from '@features/realtime/realtime-provider';
import NotificationBell from '@features/notifications/NotificationBell';
import QuickNoteButton from '@features/notes/QuickNoteButton';
import { notesChanged } from '@features/notes/notes-changes';
import { runsChanged } from '@features/packages/run-changes';
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
    // A run started or ended: an open run list fetches again.
    onCleanup(realtime.subscribe('block_run.started', () => runsChanged()));
    onCleanup(realtime.subscribe('block_run.completed', () => runsChanged()));
    const location = useLocation();
    // The sign-in page stands alone: nowhere to go before signing in.
    const showNav = () => location.pathname !== '/auth';

    // After moving to another page, focus goes to its heading: otherwise it
    // stays on the link followed (often in the footer, which stays), and the
    // next Tab goes on from there instead of into the new page.
    createEffect(
        on(
            () => location.pathname,
            () => focusHeading(),
            { defer: true }
        )
    );

    return (
        <div class="container">
            <a class="skip-link" href="#main">
                {t('nav.skip', 'Skip to content')}
            </a>

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

            <main id="main" tabIndex={-1}>
                {props.children}
            </main>

            <Footer />

            <RealtimeNotices />

            <ConsentBanner />
            <ConsentSettings />

            <MaintenanceScreen />
        </div>
    );
};

// A lazily loaded page renders a moment later: look for its heading for up
// to a second. Not while a dialog has the focus.
function focusHeading(tries = 30) {
    requestAnimationFrame(() => {
        if (document.activeElement?.closest('dialog[open]')) return;
        const heading = document.querySelector<HTMLElement>('main h1');
        if (!heading) {
            if (tries > 0) focusHeading(tries - 1);
            return;
        }
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        window.scrollTo({ top: 0 });
    });
}

export default Layout;
