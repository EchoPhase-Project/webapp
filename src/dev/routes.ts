import { createComponent, lazy, type Component } from 'solid-js';

/** One playground page: its address, its name and what it shows. */
export type DevPage = {
    path: string;
    title: string;
    /** One line on the index (/dev) and under the page's title. */
    description: string;
    /**
     * lazy(() => import('./XPage')): only the dev server loads it. The
     * index gets the list of pages as a prop.
     */
    component: Component<{ pages: readonly DevPage[] }> & {
        preload: () => Promise<unknown>;
    };
};

let pages: DevPage[] | undefined;

/**
 * The playground pages, in the index's order: a new page needs one entry
 * here and nothing else. Made on the first call (not at import): a build
 * drops this module, and a lazy() at its top would keep the pages' chunks.
 */
export function devPages(): DevPage[] {
    pages ??= [
        {
            path: '/dev/buttons',
            title: 'Buttons',
            description:
                'Button in every variant, busy and disabled; HeaderButton, RemoveButton, Switch, Tabs and NavTabs.',
            component: lazy(() => import('./ButtonsPage')),
        },
        {
            path: '/dev/forms',
            title: 'Forms',
            description:
                'Field, TextArea, Select, Checkbox, RadioGroup, FieldError, ErrorSummary and FilePicker, with the errors on or off.',
            component: lazy(() => import('./FormsPage')),
        },
        {
            path: '/dev/listbox',
            title: 'Listbox',
            description:
                'A list that is always visible, with one choice and with more than one.',
            component: lazy(() => import('./ListboxPage')),
        },
        {
            path: '/dev/combobox',
            title: 'Combobox',
            description:
                'Select-only and editable comboboxes, and TimeZoneField.',
            component: lazy(() => import('./ComboboxPage')),
        },
        {
            path: '/dev/markdown',
            title: 'Markdown',
            description:
                'MarkdownEditor with its Write and Preview tabs, and Markdown on a sample of every element.',
            component: lazy(() => import('./MarkdownPage')),
        },
        {
            path: '/dev/dialogs',
            title: 'Dialogs',
            description:
                'Modal (usual, wide, patterned, not dismissible) and ConfirmDialog with busy and errors.',
            component: lazy(() => import('./DialogsPage')),
        },
        {
            path: '/dev/popover',
            title: 'Popover',
            description:
                'A non-modal panel under or beside its trigger, at the start or the end, auto or manual.',
            component: lazy(() => import('./PopoverPage')),
        },
        {
            path: '/dev/surfaces',
            title: 'Surfaces',
            description:
                'Card, SettingsCard, EmptyState, LoadError, PageHeader, BackLink and Masonry.',
            component: lazy(() => import('./SurfacesPage')),
        },
        {
            path: '/dev/share-list',
            title: 'ShareList',
            description:
                'Whom something is shared with, on fake data in memory: as a card and as a section.',
            component: lazy(() => import('./ShareListPage')),
        },
        {
            path: '/dev/content',
            title: 'Avatar and BrandMark',
            description:
                'Avatars in each size with their gradients, and the brand mark.',
            component: lazy(() => import('./ContentPage')),
        },
        {
            path: '/dev/icons',
            title: 'Icons',
            description: 'Every icon that icons.ts exports, with its name.',
            component: lazy(() => import('./IconsPage')),
        },
        {
            path: '/dev/table',
            title: 'Table',
            description: 'A table of webhooks with a status pill in a cell.',
            component: lazy(() => import('./TablePage')),
        },
        {
            path: '/dev/spin',
            title: 'Spin',
            description: 'An experiment: a card that tilts under the pointer.',
            component: lazy(() => import('./SpinPage')),
        },
        {
            path: '/dev/drag',
            title: 'Drag',
            description: 'An experiment: an element that the pointer drags.',
            component: lazy(() => import('./DragPage')),
        },
    ];
    return pages;
}

/** The index of the playground. */
export const DEV_INDEX = '/dev';

/**
 * Pages for trying out components, under /dev. Only `vite` (dev mode) has
 * them: the router asks for them behind `import.meta.env.DEV`, which a
 * build replaces with false, so neither this module nor the pages ship.
 * Each page shows in a frame (DevFrame): its header and a link back to the
 * index. The frame and the pages do not import this module (they get what
 * they need as props): Rollup would keep the list, and with it each page's
 * chunk, for them.
 */
export function devRoutes() {
    const Frame = lazy(() => import('./DevFrame'));
    const index: DevPage = {
        path: DEV_INDEX,
        title: 'Dev playground',
        description:
            'Each shared component on a page of its own, in its variants and states, for a check by hand.',
        component: lazy(() => import('./DevIndexPage')),
    };
    const pages = devPages();
    return [index, ...pages].map((page) => ({
        path: page.path,
        component: () =>
            createComponent(Frame, {
                page,
                pages,
                back: page === index ? undefined : index.path,
            }),
    }));
}
