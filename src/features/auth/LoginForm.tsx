import { IconLock, IconUser } from '@shared/ui/icons';
import { loginMutation } from '@shared/api/auth';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import Button from '@shared/ui/Button';
import Field from '@shared/ui/forms/Field';
import { createForm } from '@shared/ui/forms/form';

export default function LoginForm(props: {
    /** Where to go once signed in (?next=). */
    next?: string;
    onSwitch: () => void;
}) {
    const i18n = useI18n();
    const t = useLocalizer('auth');

    const form = createForm({
        id: 'login',
        initial: () => ({ username: '', password: '' }),
        locked: () => i18n.isLoading(),
    });
    const login = form.mutation(loginMutation);

    const isDisabled = () => form.busy() || i18n.isLoading();

    // A new session starts, at ?next= (or home).
    const handleLogin = form.onSubmit((credentials) =>
        login.run({ credentials, next: props.next })
    );

    return (
        <form class="vert-form" onSubmit={handleLogin} noValidate>
            <h1 class="form-title">{t('login.title', 'Log in')}</h1>

            <ErrorSummary {...form.summary} />

            <Field
                {...form.input('username')}
                label={t('ui.username', 'Username')}
                icon={IconUser}
                type="text"
                autocomplete="username"
            />

            <Field
                {...form.input('password')}
                label={t('form.password', 'Password')}
                icon={IconLock}
                type="password"
                autocomplete="current-password"
            />

            <Button type="submit" busy={isDisabled()}>
                {isDisabled()
                    ? i18n.t('ui.loading', 'Loading…')
                    : t('login.submit', 'Log in')}
            </Button>

            <p class="auth-switch">
                {t('login.switch_question', 'No account yet?')}{' '}
                <Button variant="link" onClick={() => props.onSwitch()}>
                    {t('login.switch', 'Sign up')}
                </Button>
            </p>
        </form>
    );
}
