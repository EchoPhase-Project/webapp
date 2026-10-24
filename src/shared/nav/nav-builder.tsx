import { Show } from 'solid-js';
import type { NavLink } from './nav-link';
import { DesktopNav } from './desktop-nav';
import { MobileNav } from './mobile-nav';
import { useIsMobile } from './use-is-mobile';

/**
 * Smart wrapper that renders either MobileNav or DesktopNav
 * based on viewport width. The navLinks array is shared via
 * the parent's signal — switching layouts never resets it.
 */
export function NavBuilder(props: { links: NavLink[] }) {
    const isMobile = useIsMobile();

    return (
        <Show when={isMobile()} fallback={<DesktopNav links={props.links} />}>
            <MobileNav links={props.links} />
        </Show>
    );
}
