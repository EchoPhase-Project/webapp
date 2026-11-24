import { useSearchParams } from '@solidjs/router';
import { usePageMeta } from '@shared/meta/page-meta';
import { useLocalizer } from '@shared/i18n/i18n-context';
import AuthShell, { type AuthSearch } from './components/AuthShell';
import LoginForm from './components/LoginForm';
import './auth.scss';

/** Logging in; its link under the form goes to the sign-up page. */
export default function LoginPage() {
    const t = useLocalizer('auth');
    const [search] = useSearchParams<AuthSearch>();

    usePageMeta(() => ({
        title: t('login.title', 'Log in'),
        description: t('login.description', 'Log in to EchoPhase.'),
    }));

    return (
        <AuthShell
            title={t('login.title', 'Log in')}
            description={t('login.lead', 'Welcome back.')}
        >
            <LoginForm next={search.next} />
        </AuthShell>
    );
}
