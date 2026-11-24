import { Show } from 'solid-js';
import { Navigate, useSearchParams } from '@solidjs/router';
import { usePageMeta } from '@shared/meta/page-meta';
import { useLocalizer } from '@shared/i18n/i18n-context';
import AuthShell, { authHref, type AuthSearch } from './components/AuthShell';
import LoginForm from './components/LoginForm';
import './auth.scss';

/** Signing in; its link under the form goes to /auth/register. */
export default function LoginPage() {
    const t = useLocalizer('auth');
    const [search] = useSearchParams<AuthSearch>();

    usePageMeta(() => ({
        title: t('login.title', 'Log in'),
        description: t('login.description', 'Log in to EchoPhase.'),
    }));

    return (
        <Show
            // Addresses from before the two pages: ?mode=signup.
            when={search.mode !== 'signup'}
            fallback={
                <Navigate href={authHref('/auth/register', search.next)} />
            }
        >
            <AuthShell
                title={t('login.title', 'Log in')}
                description={t('login.lead', 'Welcome back.')}
            >
                <LoginForm next={search.next} />
            </AuthShell>
        </Show>
    );
}
