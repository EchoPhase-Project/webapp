import { Component, lazy } from 'solid-js';
import { Router } from '@solidjs/router';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { AuthProvider } from '@shared/api/auth-provider';
import { requireAuth } from '@shared/api/auth-guards';
import { ThemeProvider } from '@shared/theme/theme-context';
import { RealtimeProvider } from '@features/realtime/realtime-provider';
import { devRoutes } from '@dev/routes';

interface RouterComponentProps {
    base?: string;
    root: Component;
}

const routes = [
    {
        path: '/',
        component: lazy(() => import('@features/home/HomePage')),
    },
    {
        path: '/about',
        component: lazy(() => import('@features/about/AboutPage')),
    },
    {
        path: '/terms',
        component: lazy(() => import('@features/legal/TermsPage')),
    },
    {
        path: '/privacy',
        component: lazy(() => import('@features/legal/PrivacyPage')),
    },
    {
        path: '/auth',
        component: lazy(() => import('@features/auth/AuthPage')),
    },
    {
        path: '/sessions',
        component: requireAuth(
            lazy(() => import('@features/sessions/SessionsPage'))
        ),
    },
    {
        path: '/api-clients',
        component: requireAuth(
            lazy(() => import('@features/api-clients/ApiClientsPage'))
        ),
    },
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
