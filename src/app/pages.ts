import type { Component } from 'solid-js';
import {
    IconAdjustmentsHorizontal,
    IconCompass,
    IconFolder,
    IconLayoutGrid,
    IconNotes,
    IconPackage,
    IconUser,
} from '@shared/ui/icons';
import { lazyPage } from './PageLoading';

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
        icon: IconLayoutGrid,
        key: 'nav.workspace',
        text: 'Workspace',
    },
    settings: {
        icon: IconAdjustmentsHorizontal,
        key: 'nav.settings',
        text: 'Settings',
    },
};

/**
 * Every page of the app, in one place: the router takes its routes from
 * here and the sidebar its entries. A new page is one line here (plus
 * robots.txt when it is public).
 */
export const PAGES: Page[] = [
    {
        path: '/',
        component: lazyPage(() => import('@features/home/HomePage')),
        public: true,
    },
    {
        path: '/about',
        component: lazyPage(() => import('@features/about/AboutPage'), {
            skeleton: 'detail',
        }),
        public: true,
    },
    {
        path: '/terms',
        component: lazyPage(() => import('@features/legal/TermsPage'), {
            skeleton: 'document',
        }),
        public: true,
    },
    {
        path: '/privacy',
        component: lazyPage(() => import('@features/legal/PrivacyPage'), {
            skeleton: 'document',
        }),
        public: true,
    },
    {
        path: '/docs/:slug?',
        component: lazyPage(() => import('@features/docs/DocsPage'), {
            skeleton: 'document',
        }),
        public: true,
    },
    {
        path: '/auth',
        component: lazyPage(() => import('@features/auth/LoginPage')),
    },
    {
        path: '/auth/register',
        component: lazyPage(() => import('@features/auth/RegisterPage')),
    },
    {
        path: '/explore',
        component: lazyPage(() => import('@features/packages/ExplorePage'), {
            skeleton: 'cards',
        }),
        auth: true,
        nav: {
            icon: IconCompass,
            key: 'nav.explore.label',
            text: 'Explore',
            description: {
                key: 'nav.explore.description',
                text: 'Workflow packages to install',
            },
        },
    },
    {
        path: '/packages',
        component: lazyPage(() => import('@features/packages/PackagesPage'), {
            skeleton: 'list',
        }),
        auth: true,
        nav: {
            icon: IconPackage,
            key: 'nav.packages.label',
            text: 'Packages',
            description: {
                key: 'nav.packages.description',
                text: 'Your workflows, in packages',
            },
        },
    },
    {
        // :section: runs or settings; absent: its workflows.
        path: '/packages/:id/:section?',
        component: lazyPage(() => import('@features/packages/MyPackagePage'), {
            skeleton: 'detail',
        }),
        auth: true,
    },
    {
        // :tab: webhooks, schedules, runs or versions; absent: its overview.
        path: '/packages/:packageId/workflows/:id/:tab?',
        component: lazyPage(() => import('@features/packages/WorkflowPage'), {
            skeleton: 'detail',
        }),
        auth: true,
    },
    {
        // Addresses from before packages: to the workflow in its package.
        path: '/workflows/:id?',
        component: lazyPage(
            () => import('@features/packages/WorkflowRedirect')
        ),
        auth: true,
    },
    {
        path: '/explore/:id',
        component: lazyPage(() => import('@features/packages/PackagePage'), {
            skeleton: 'detail',
        }),
        auth: true,
    },
    {
        path: '/notes',
        component: lazyPage(() => import('@features/notes/NotesPage'), {
            skeleton: 'cards',
        }),
        auth: true,
        nav: {
            icon: IconNotes,
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
        component: lazyPage(() => import('@features/files/FilesPage'), {
            skeleton: 'table',
        }),
        auth: true,
        nav: {
            icon: IconFolder,
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
        component: lazyPage(() => import('@features/profile/ProfilePage'), {
            skeleton: 'settings',
        }),
        auth: true,
        nav: {
            icon: IconUser,
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
        component: lazyPage(() => import('@features/sessions/SessionsPage'), {
            // Few columns: wider, the cells would only stretch.
            skeleton: 'table',
            width: 'default',
        }),
        auth: true,
        nav: {
            icon: IconAdjustmentsHorizontal,
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
        component: lazyPage(
            () => import('@features/api-clients/ApiClientsPage'),
            // Few columns: wider, the cells would only stretch.
            { skeleton: 'table', width: 'default' }
        ),
        auth: true,
        nav: {
            icon: IconAdjustmentsHorizontal,
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
