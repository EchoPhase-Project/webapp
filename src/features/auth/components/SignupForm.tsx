import { A } from '@solidjs/router';
import { IconLock, IconTags, IconUser } from '@shared/ui/icons';
import { registerMutation } from '@shared/api/auth';
import { DateHelper } from '@shared/lib/date-helper';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import Button from '@shared/ui/Button';
import Field from '@shared/ui/forms/Field';
import { createForm } from '@shared/ui/forms/form';
import { LOGIN_PATH } from '@shared/api/auth-guards';
import { authHref } from './AuthShell';

export default function SignupForm(props: {
    /** Where to go once signed up (?next=). */
    next?: string;
}) {
    const i18n = useI18n();
    const t = useLocalizer('auth');

    const form = createForm({
        id: 'register',
        initial: () => ({ name: '', username: '', password: '' }),
        locked: () => i18n.isLoading(),
    });
    const register = form.mutation(registerMutation);

    const isDisabled = () => form.busy() || i18n.isLoading();

    // A new session starts, at ?next= (or home).
    // The zone is the browser's, not a field: the user can change it later.
    const handleRegister = form.onSubmit((values) =>
        register.run({
            data: { ...values, timeZone: DateHelper.browserTimeZone() },
            next: props.next,
        })
    );

    return (
        <form class="vert-form" onSubmit={handleRegister} noValidate>
            <ErrorSummary {...form.summary} />

            <Field
                {...form.input('name')}
                label={t('form.fullname', 'Full name')}
                icon={IconUser}
                type="text"
                autocomplete="name"
            />

            <Field
                {...form.input('username')}
                label={t('ui.username', 'Username')}
                icon={IconTags}
                type="text"
                autocomplete="username"
            />

            <Field
                {...form.input('password')}
                label={t('form.password', 'Password')}
                icon={IconLock}
                type="password"
                autocomplete="new-password"
            />

            <Button type="submit" busy={isDisabled()}>
                {isDisabled()
                    ? i18n.t('ui.loading', 'Loading…')
                    : t('signup.submit', 'Create account')}
            </Button>

            <p class="auth-legal">
                {t('signup.legal_before', 'By signing up you accept the')}{' '}
                <A href="/terms">{t('signup.terms', 'Terms of Use')}</A>{' '}
                {t('signup.legal_and', 'and the')}{' '}
                <A href="/privacy">{t('signup.privacy', 'Privacy Policy')}</A>.
            </p>

            <p class="auth-switch">
                {t('signup.switch_question', 'Already have an account?')}{' '}
                <A href={authHref(LOGIN_PATH, props.next)}>
                    {t('signup.switch', 'Log in')}
                </A>
            </p>
        </form>
    );
}
