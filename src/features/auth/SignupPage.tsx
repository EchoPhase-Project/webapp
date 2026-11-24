import { useSearchParams } from '@solidjs/router';
import { usePageMeta } from '@shared/meta/page-meta';
import { useLocalizer } from '@shared/i18n/i18n-context';
import AuthShell, { type AuthSearch } from './components/AuthShell';
import SignupForm from './components/SignupForm';
import './auth.scss';

/** Signing up; its link under the form goes to the login page. */
export default function SignupPage() {
    const t = useLocalizer('auth');
    const [search] = useSearchParams<AuthSearch>();

    usePageMeta(() => ({
        title: t('signup.title', 'Sign up'),
        description: t('signup.description', 'Create an EchoPhase account.'),
    }));

    return (
        <AuthShell
            title={t('signup.title', 'Sign up')}
            description={t(
                'signup.lead',
                'One account for your workflows, notes and files.'
            )}
        >
            <SignupForm next={search.next} />
        </AuthShell>
    );
}
