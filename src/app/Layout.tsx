import { Component, Show } from 'solid-js';
import type { ParentProps } from 'solid-js';
import { useLocation } from '@solidjs/router';
import { NavBuilder } from '@shared/nav/nav-builder';
import { Header } from '@shared/ui/Header';
import RealtimeNotices from '@features/realtime/RealtimeNotices';
import MaintenanceScreen from '@features/maintenance/MaintenanceScreen';
import ConsentBanner from '@features/consent/ConsentBanner';
import ConsentSettings from '@features/consent/ConsentSettings';
import { useNavLinks } from './nav-links';
import Footer from './Footer';
import '@shared/styles/global.scss';

const Layout: Component<ParentProps> = (props) => {
    const navLinks = useNavLinks();
    const location = useLocation();
    // The sign-in page stands alone: nowhere to go before signing in.
    const showNav = () => location.pathname !== '/auth';

    return (
        <div class="container">
            <Show when={showNav()}>
                <NavBuilder links={navLinks()} />
            </Show>

            <Header />

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
