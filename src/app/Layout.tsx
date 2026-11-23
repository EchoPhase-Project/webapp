import {
    Component,
    createEffect,
    createSignal,
    on,
    onCleanup,
    Show,
} from 'solid-js';
import type { ParentProps } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { useQueryClient } from '@tanstack/solid-query';
import { NavBuilder } from '@shared/nav/nav-builder';
import { Header } from './Header';
import RealtimeNotices from '@features/realtime/RealtimeNotices';
import { useRealtime } from '@features/realtime/realtime-provider';
import NotificationBell from '@features/notifications/NotificationBell';
import QuickNoteButton from '@features/notes/QuickNoteButton';
import { followNoteEvents } from '@features/notes/note-events';
import { followRunEvents } from '@features/packages/run-events';
import { useAuth } from '@shared/api/auth';
import { useI18n } from '@shared/i18n/i18n-context';
import MaintenanceScreen from '@features/maintenance/MaintenanceScreen';
import ConsentBanner from '@features/consent/ConsentBanner';
import ConsentSettings from '@features/consent/ConsentSettings';
import { useNav } from './nav-links';
import Footer from './Footer';
import PageErrorBoundary from './PageErrorBoundary';
import PageLoading, { createPageLoading } from './PageLoading';
import '@shared/styles/global.scss';

const Layout: Component<ParentProps> = (props) => {
    const nav = useNav();
    const realtime = useRealtime();
    const queryClient = useQueryClient();
    const { isAuthenticated, user } = useAuth();
    const { t } = useI18n();
    // A note shared with the user shows up in an open list at once.
    onCleanup(followNoteEvents(realtime, queryClient));
    // A run started: merged on top of the open run lists; a run done:
    // patched in place from the event.
    onCleanup(followRunEvents(realtime, queryClient));
    const location = useLocation();
    // The sign-in page stands alone: nowhere to go before signing in.
    const showNav = () => location.pathname !== '/auth';

    const loading = createPageLoading();

    // After moving to another page, focus goes to its heading: otherwise it
    // stays on the link followed (often in the footer, which stays), and the
    // next Tab goes on from there instead of into the new page. A page whose
    // code is still loading has no heading yet: wait for its code first.
    const [focusWanted, setFocusWanted] = createSignal(false);
    createEffect(
        on(
            () => location.pathname,
            () => setFocusWanted(true),
            { defer: true }
        )
    );
    createEffect(() => {
        if (!focusWanted() || loading.pending()) return;
        setFocusWanted(false);
        focusHeading();
    });

    // The frame (an L): the bar across the top with the logo, the rail under
    // it on desktop. Tab order: the skip link, the logo and the bar's
    // buttons, the rail, then the page.
    return (
        <div class="container" classList={{ 'container--rail': showNav() }}>
            <a class="skip-link" href="#main">
                {t('nav.skip', 'Skip to content')}
            </a>

            <Header
                rail={showNav()}
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

            <Show when={showNav()}>
                <NavBuilder nav={nav()} />
            </Show>

            {/* The page beside the rail: main and the footer, clear of it,
                as wide as the page's type allows. */}
            <div class="container-page" data-page-width={loading.width()}>
                <main id="main" tabIndex={-1}>
                    <PageLoading state={loading}>
                        {/* A page that throws takes only itself down. */}
                        <PageErrorBoundary>{props.children}</PageErrorBoundary>
                    </PageLoading>
                </main>

                <Footer />
            </div>

            <RealtimeNotices />

            <ConsentBanner />
            <ConsentSettings />

            <MaintenanceScreen />
        </div>
    );
};

// A page renders a moment after its code is in (or after the user is
// known): look for its heading for up to 30 frames. A heading in a part
// that still loads (SkeletonScope: inert) cannot take the focus yet. Not
// while a dialog has the focus.
function focusHeading(tries = 30) {
    requestAnimationFrame(() => {
        if (document.activeElement?.closest('dialog[open]')) return;
        const heading = document.querySelector<HTMLElement>('main h1');
        if (!heading || heading.closest('[inert]')) {
            if (tries > 0) focusHeading(tries - 1);
            return;
        }
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        window.scrollTo({ top: 0 });
    });
}

export default Layout;
