import { Show } from 'solid-js';
import type { NavModel } from './nav-link';
import { DesktopNav } from './desktop-nav';
import { MobileNav } from './mobile-nav';
import { useIsMobile } from './use-is-mobile';

/** The sidebar on desktop, the bar and drawer on phones; the same model. */
export function NavBuilder(props: { nav: NavModel }) {
    const isMobile = useIsMobile();

    return (
        <Show when={isMobile()} fallback={<DesktopNav nav={props.nav} />}>
            <MobileNav nav={props.nav} />
        </Show>
    );
}
