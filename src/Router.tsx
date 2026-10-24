import { Component, lazy } from 'solid-js';
import { Router } from '@solidjs/router';
import { NavProvider } from '@lib/nav';
import { I18nProvider } from '@lib/i18n';
import { AuthProvider } from '@lib/api';
import { ThemeProvider } from '@lib/theme';
import { RealtimeProvider } from '@lib/realtime';
import { devRoutes } from './dev/routes';

interface RouterComponentProps {
    base?: string;
    root: Component;
}

const routes = [
    {
        path: '/',
        component: lazy(() => import('./pages/HomePage')),
    },
    {
        path: '/about',
        component: lazy(() => import('./components/About')),
    },
    {
        path: '/auth',
        component: lazy(() => import('./pages/AuthPage')),
    },
    {
        path: '/sessions',
        component: lazy(() => import('./pages/SessionsPage')),
    },
    {
        path: '/api-clients',
        component: lazy(() => import('./pages/ApiClientsPage')),
    },
    ...(import.meta.env.DEV ? devRoutes() : []),
    {
        path: '*404',
        component: lazy(() => import('./components/NotFound')),
    },
];

const RouterComponent = (props: RouterComponentProps) => (
    <ThemeProvider>
        <I18nProvider>
            <AuthProvider>
                <RealtimeProvider>
                    <NavProvider>
                        <Router base={props.base} root={props.root}>
                            {routes}
                        </Router>
                    </NavProvider>
                </RealtimeProvider>
            </AuthProvider>
        </I18nProvider>
    </ThemeProvider>
);

export default RouterComponent;
