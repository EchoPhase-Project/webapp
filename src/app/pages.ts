import { lazy, type Component } from 'solid-js';
import {
    AiOutlineAppstore,
    AiOutlineCompass,
    AiOutlineFolder,
    AiOutlineUser,
} from 'solid-icons/ai';
import { VsNote, VsSettings } from 'solid-icons/vs';

/** A sidebar group: its entry opens a sub-menu of the pages in it. */
export type NavGroup = 'workspace' | 'settings';

/** How a page shows in the navigation; text is a key with its English fallback. */
export interface PageNav {
    icon: Component;
    /** i18n key of the label, e.g. "nav.files". */
    key: string;
    text: string;
    /** In a group's sub-menu: the line under the label (key + fallback). */
    description?: { key: string; text: string };
    group?: NavGroup;
}

export interface Page {
    path: string;
    component: Component;
    /** Only with a session: signed-out visitors go to /auth. */
    auth?: boolean;
    /** For search engines: listed in public/robots.txt (a test checks). */
    public?: boolean;
    /** In the sidebar, in this list's order; once signed in when `auth`. */
    nav?: PageNav;
}

/** The groups' own entries in the sidebar, where their first page would be. */
export const NAV_GROUPS: Record<NavGroup, Omit<PageNav, 'group'>> = {
    workspace: {
        icon: AiOutlineAppstore,
        key: 'nav.workspace',
        text: 'Workspace',
    },
    settings: { icon: VsSettings, key: 'nav.settings', text: 'Settings' },
};

/**
 * Every page of the app, in one place: the router takes its routes from
 * here and the sidebar its entries. A new page is one line here (plus
 * robots.txt when it is public).
 */
export const PAGES: Page[] = [
    {
        path: '/',
        component: lazy(() => import('@features/home/HomePage')),
        public: true,
    },
    {
        path: '/about',
        component: lazy(() => import('@features/about/AboutPage')),
        public: true,
    },
    {
        path: '/terms',
        component: lazy(() => import('@features/legal/TermsPage')),
        public: true,
    },
    {
        path: '/privacy',
        component: lazy(() => import('@features/legal/PrivacyPage')),
        public: true,
    },
    {
        path: '/auth',
        component: lazy(() => import('@features/auth/AuthPage')),
    },
    {
        path: '/explore',
        component: lazy(() => import('@features/packages/ExplorePage')),
        auth: true,
        nav: {
            icon: AiOutlineCompass,
            key: 'nav.explore.label',
            text: 'Explore',
            description: {
                key: 'nav.explore.description',
                text: 'Workflow packages to install',
            },
        },
    },
    {
        path: '/explore/:id',
        component: lazy(() => import('@features/packages/PackagePage')),
        auth: true,
    },
    {
        path: '/notes',
        component: lazy(() => import('@features/notes/NotesPage')),
        auth: true,
        nav: {
            icon: VsNote,
            key: 'nav.notes.label',
            text: 'Notes',
            description: {
                key: 'nav.notes.description',
                text: 'Markdown, shared and from workflows',
            },
            group: 'workspace',
        },
    },
    {
        path: '/files',
        component: lazy(() => import('@features/files/FilesPage')),
        auth: true,
        nav: {
            icon: AiOutlineFolder,
            key: 'nav.files.label',
            text: 'Files',
            description: {
                key: 'nav.files.description',
                text: 'Uploads and workflow results',
            },
            group: 'workspace',
        },
    },
    {
        path: '/profile',
        component: lazy(() => import('@features/profile/ProfilePage')),
        auth: true,
        nav: {
            icon: AiOutlineUser,
            key: 'nav.profile.label',
            text: 'Profile',
            description: {
                key: 'nav.profile.description',
                text: 'Picture, name and time zone',
            },
            group: 'settings',
        },
    },
    {
        path: '/sessions',
        component: lazy(() => import('@features/sessions/SessionsPage')),
        auth: true,
        nav: {
            icon: VsSettings,
            key: 'nav.sessions.label',
            text: 'Sessions',
            description: {
                key: 'nav.sessions.description',
                text: 'View active sessions',
            },
            group: 'settings',
        },
    },
    {
        path: '/api-clients',
        component: lazy(() => import('@features/api-clients/ApiClientsPage')),
        auth: true,
        nav: {
            icon: VsSettings,
            key: 'nav.api_clients.label',
            text: 'API clients',
            description: {
                key: 'nav.api_clients.description',
                text: 'Credentials for bots and scripts',
            },
            group: 'settings',
        },
    },
];
