import { createSignal, onCleanup, createEffect } from 'solid-js';
import type { NavSection } from './nav-link';

/** Where a page's own groups go: after the section linking to this address. */
export interface PageSection {
    after: string;
    /** In order: e.g. a package's group, then its workflow's. */
    sections: NavSection[];
}

const [current, setCurrent] = createSignal<PageSection | null>(null);

/** The groups of the page being shown, if it has any. */
export const pageSection = current;

/**
 * Gives the navigation groups of this page's own while it is shown, e.g.
 * a package's workflows, runs and settings next to "Packages", and the
 * open workflow's own parts after it. Null: none (yet). Gone when the page is.
 */
export function usePageSection(build: () => PageSection | null) {
    createEffect(() => setCurrent(build()));
    onCleanup(() => setCurrent(null));
}
