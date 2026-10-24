import { createSignal } from 'solid-js';
import { FaRegularUser } from 'solid-icons/fa';
import { BiRegularLock } from 'solid-icons/bi';
import { groupErrors } from '@shared/api/errors';
import { useAuth } from '@shared/api/auth-provider';
import type { FormErrors } from '@shared/api/errors';
import type { LoginCredentials } from '@shared/api/types';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Button from '@shared/ui/Button';
import Field from '@shared/ui/Field';

const FIELDS = ['username', 'password'] as const;
const inputId = (field: string) => `login-${field}`;

export default function LoginForm() {
    const i18n = useI18n();
    const t = useLocalizer('auth');
    const auth = useAuth();

    const [loginForm, setLoginForm] = createSignal<LoginCredentials>({
        username: '',
        password: '',
    });

    const [errors, setErrors] = createSignal<FormErrors>({});

    const isDisabled = () => auth.isLoading() || i18n.isLoading();

    async function handleLogin(e: Event) {
        e.preventDefault();

        const result = await auth.login(loginForm());

        if (result.success) {
            setErrors({});
            // AuthPage takes the user on (to ?next=) once signed in.
        } else {
            setErrors(groupErrors(result.error ?? [], FIELDS));
        }
    }

    return (
        <form
            class="vert-form"
            onSubmit={(e) => void handleLogin(e)}
            noValidate
        >
            <h4 class="form-title">{t('login', 'Log In')}</h4>

            <ErrorSummary errors={errors()} inputId={inputId} />

            <Field
                id={inputId('username')}
                name="username"
                label={t('form.username', 'Your Username')}
                icon={FaRegularUser}
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
                label={t('form.password', 'Your Password')}
                icon={BiRegularLock}
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
                    ? i18n.t('loading', 'Loading…')
                    : t('form.submit', 'SUBMIT')}
            </Button>
        </form>
    );
}
