import { Component, lazy } from 'solid-js';
import { Router } from '@solidjs/router';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { AuthProvider } from '@shared/api/auth-provider';
import { requireAuth } from '@shared/api/auth-guards';
import { ThemeProvider } from '@shared/theme/theme-context';
import { RealtimeProvider } from '@features/realtime/realtime-provider';
import { devRoutes } from '@dev/routes';
import { PAGES } from './pages';

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
        component: lazy(() => import('./NotFound')),
    },
];

const RouterComponent = (props: RouterComponentProps) => (
    <ThemeProvider>
        <I18nProvider>
            <AuthProvider>
                <RealtimeProvider>
                    <Router base={props.base} root={props.root}>
                        {routes}
                    </Router>
                </RealtimeProvider>
            </AuthProvider>
        </I18nProvider>
    </ThemeProvider>
);

export default RouterComponent;
