import type { Component } from 'solid-js';

/** One destination: a page (`href`, a real link) or an action (`onSelect`). */
export interface NavItem {
    icon?: Component;
    label: string;
    /** The line under the label in a group's list. */
    description?: string;
    href?: string;
    /** Current only at exactly `href`, not below it (an overview among its parts). */
    end?: boolean;
    onSelect?: () => void;
}

/** A section of the middle part: a page, or a group of pages. */
export interface NavSection {
    icon: Component;
    label: string;
    href?: string;
    /** A group: its pages, opened in place of following a link. */
    items?: NavItem[];
}

/** Who is signed in, and what their menu at the bottom holds. */
export interface NavAccount {
    id: string;
    name: string;
    userName?: string | null;
    avatarFileId?: string | null;
    items: NavItem[];
}

/**
 * The navigation in three parts: the top (home), the middle (every section,
 * scrolling when it does not fit) and the bottom (the account, or signing
 * in). Both the desktop sidebar and the mobile drawer draw it.
 */
export interface NavModel {
    /** The mobile bar and drawer draw it; on desktop the app's bar holds it. */
    home: NavSection;
    sections: NavSection[];
    /**
     * Null while signed out (or still loading). Signing in and up are in
     * the app's bar, not here.
     */
    account: NavAccount | null;
}
