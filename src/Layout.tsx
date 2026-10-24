import { Component, Show } from 'solid-js';
import type { ParentProps } from 'solid-js';
import { useNav, NavBuilder } from '@lib/nav';
import { Header } from '@/components/Header';
import RealtimeNotices from '@/components/RealtimeNotices';
import MaintenanceScreen from '@/components/MaintenanceScreen';
import '@styles/global.scss';

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
