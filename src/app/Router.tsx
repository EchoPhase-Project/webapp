import { Component, lazy } from 'solid-js';
import { Router } from '@solidjs/router';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { SessionProvider, sessionStart } from '@shared/api/session-provider';
import { requireAuth } from '@shared/api/auth-guards';
import { ThemeProvider } from '@shared/theme/theme-context';
import { RealtimeProvider } from '@features/realtime/realtime-provider';
import { devRoutes } from '@dev/routes';
import { PAGES } from './pages';
import { lazyPage } from './PageLoading';

interface RouterComponentProps {
    base?: string;
    root: Component;
}

// Pages from the registry (pages.ts); signed-in ones behind the guard.
const routes = [
    ...PAGES.map((page) => ({
        path: page.path,
        component: page.auth ? requireAuth(page.component) : page.component,
    })),
    ...(import.meta.env.DEV ? devRoutes() : []),
    {
        path: '*404',
        component: lazyPage(() => import('./NotFound')),
    },
];

// The query cache of the session, in development only (a chunk of its own).
const QueryDevtools = import.meta.env.DEV
    ? lazy(() =>
          import('@tanstack/solid-query-devtools').then((m) => ({
              default: m.SolidQueryDevtools,
          }))
      )
    : () => null;

/**
 * The router of one session: made anew with each, so it starts where the
 * session does (after signing in, at `next`). Router takes its first
 * location from the address bar when it is made.
 */
const SessionRouter = (props: RouterComponentProps) => {
    const start = sessionStart();
    // Once, as the router is made: its base does not change.
    // eslint-disable-next-line solid/reactivity
    if (start) history.replaceState(null, '', (props.base ?? '') + start);
    return (
        <Router base={props.base} root={props.root}>
            {routes}
        </Router>
    );
};

const RouterComponent = (props: RouterComponentProps) => (
    <ThemeProvider>
        <I18nProvider>
            <SessionProvider>
                <RealtimeProvider>
                    <SessionRouter base={props.base} root={props.root} />
                </RealtimeProvider>
                <QueryDevtools />
            </SessionProvider>
        </I18nProvider>
    </ThemeProvider>
);

export default RouterComponent;
