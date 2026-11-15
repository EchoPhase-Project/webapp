import { createSignal } from 'solid-js';
import { IconLock, IconUser } from '@shared/ui/icons';
import { loginMutation } from '@shared/api/auth';
import { createSubmit } from '@shared/api/submit';
import type { LoginCredentials } from '@shared/api/types';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import Button from '@shared/ui/Button';
import Field from '@shared/ui/forms/Field';

const FIELDS = ['username', 'password'] as const;
const inputId = (field: string) => `login-${field}`;

export default function LoginForm(props: {
    /** Where to go once signed in (?next=). */
    next?: string;
    onSwitch: () => void;
}) {
    const i18n = useI18n();
    const t = useLocalizer('auth');

    const [loginForm, setLoginForm] = createSignal<LoginCredentials>({
        username: '',
        password: '',
    });

    const { busy, errors, mutation } = createSubmit(FIELDS);
    const login = mutation(loginMutation);

    const isDisabled = () => busy() || i18n.isLoading();

    // A new session starts, at ?next= (or home).
    async function handleLogin(e: Event) {
        e.preventDefault();
        await login.run({ credentials: loginForm(), next: props.next });
    }

    return (
        <form
            class="vert-form"
            onSubmit={(e) => void handleLogin(e)}
            noValidate
        >
            <h1 class="form-title">{t('login.title', 'Log in')}</h1>

            <ErrorSummary errors={errors()} inputId={inputId} />

            <Field
                id={inputId('username')}
                name="username"
                label={t('ui.username', 'Username')}
                icon={IconUser}
                errors={errors().username}
                type="text"
                autocomplete="username"
                value={loginForm().username}
                disabled={isDisabled()}
                onInput={(e) =>
                    setLoginForm((f) => ({
                        ...f,
                        username: e.currentTarget.value,
                    }))
                }
            />

            <Field
                id={inputId('password')}
                name="password"
                label={t('form.password', 'Password')}
                icon={IconLock}
                errors={errors().password}
                type="password"
                autocomplete="current-password"
                value={loginForm().password}
                disabled={isDisabled()}
                onInput={(e) =>
                    setLoginForm((f) => ({
                        ...f,
                        password: e.currentTarget.value,
                    }))
                }
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
