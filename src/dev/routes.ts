import { lazy } from 'solid-js';

/**
 * Pages for trying out components, under /dev. Only `vite` (dev mode) has
 * them: the router asks for them behind `import.meta.env.DEV`, which a
 * build replaces with false, so neither this module nor the pages ship.
 */
export function devRoutes() {
    return [
        { path: '/dev/spin', component: lazy(() => import('./SpinPage')) },
        { path: '/dev/table', component: lazy(() => import('./TablePage')) },
        { path: '/dev/drag', component: lazy(() => import('./DragPage')) },
    ];
}
