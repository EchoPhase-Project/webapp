import { Component, Show } from 'solid-js';
import type { ParentProps } from 'solid-js';
import { useNav } from '@shared/nav/nav-context';
import { NavBuilder } from '@shared/nav/nav-builder';
import { Header } from '@shared/ui/Header';
import RealtimeNotices from '@features/realtime/RealtimeNotices';
import MaintenanceScreen from '@features/maintenance/MaintenanceScreen';
import '@shared/styles/global.scss';

const Layout: Component<ParentProps> = (props) => {
    const { navLinks } = useNav();

    return (
        <div class="container">
            <div class="page-bg" aria-hidden="true" />

            <Show when={navLinks().length > 0}>
                <NavBuilder links={navLinks()} />
            </Show>

            <Header />

            <main>{props.children}</main>

            <RealtimeNotices />

            <MaintenanceScreen />
        </div>
    );
};

export default Layout;
