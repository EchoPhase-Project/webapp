import { createSignal, onCleanup, createEffect } from 'solid-js';
import type { NavSection } from './nav-link';

/** Where a page's own group goes: after the section linking to this address. */
export interface PageSection {
    after: string;
    section: NavSection;
}

const [current, setCurrent] = createSignal<PageSection | null>(null);

/** The group of the page being shown, if it has one. */
export const pageSection = current;

/**
 * Gives the navigation a group of this page's own while it is shown, e.g.
 * a package's workflows, runs and settings next to "Packages". Null: none
 * (yet). Gone when the page is.
 */
export function usePageSection(build: () => PageSection | null) {
    createEffect(() => setCurrent(build()));
    onCleanup(() => setCurrent(null));
}
