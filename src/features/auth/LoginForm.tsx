import { createSignal } from 'solid-js';
import { FaRegularUser } from 'solid-icons/fa';
import { BiRegularLock } from 'solid-icons/bi';
import { useNavigate } from '@solidjs/router';
import { groupErrors } from '@shared/api/errors';
import { useAuth } from '@shared/api/auth-provider';
import type { FormErrors } from '@shared/api/errors';
import type { LoginCredentials } from '@shared/api/types';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import ErrorSummary from '@shared/ui/ErrorSummary';
import FieldError, { errorId } from '@shared/ui/FieldError';
import '@shared/ui/forms.scss';

const FIELDS = ['username', 'password'] as const;
const inputId = (field: string) => `login-${field}`;

export default function LoginForm() {
    const i18n = useI18n();
    const t = useLocalizer('auth');
    const auth = useAuth();
    const navigate = useNavigate();

    const [loginForm, setLoginForm] = createSignal<LoginCredentials>({
        username: '',
        password: '',
    });

    const [errors, setErrors] = createSignal<FormErrors>({});

    const isDisabled = () => auth.isLoading() || i18n.isLoading();

    // aria wiring shared by every input: invalid state and its error list.
    const errorProps = (field: string) => ({
        id: inputId(field),
        name: field,
        'aria-invalid': !!errors()[field],
        'aria-describedby': errors()[field]
            ? errorId(inputId(field))
            : undefined,
    });

    async function handleLogin(e: Event) {
        e.preventDefault();

        const result = await auth.login(loginForm());

        if (result.success) {
            setErrors({});
            navigate('/');
        } else {
            setErrors(groupErrors(result.error ?? [], FIELDS));
        }
    }

    return (
        <form class="vert-form" onSubmit={handleLogin} noValidate>
            <h4 class="form-title">{t('login', 'Log In')}</h4>

            <ErrorSummary errors={errors()} inputId={inputId} />

            <label class="visually-hidden" for={inputId('username')}>
                {t('form.username', 'Your Username')}
            </label>
            <div class="form-group">
                <FaRegularUser class="input-icon" />
                <input
                    {...errorProps('username')}
                    class="form-style"
                    type="text"
                    autocomplete="username"
                    placeholder={t('form.username', 'Your Username')}
                    value={loginForm().username}
                    disabled={isDisabled()}
                    onInput={(e) =>
                        setLoginForm((f) => ({
                            ...f,
                            username: e.currentTarget.value,
                        }))
                    }
                />
            </div>
            <FieldError for={inputId('username')} errors={errors().username} />

            <label class="visually-hidden" for={inputId('password')}>
                {t('form.password', 'Your Password')}
            </label>
            <div class="form-group">
                <BiRegularLock class="input-icon" />
                <input
                    {...errorProps('password')}
                    class="form-style"
                    type="password"
                    autocomplete="current-password"
                    placeholder={t('form.password', 'Your Password')}
                    value={loginForm().password}
                    disabled={isDisabled()}
                    onInput={(e) =>
                        setLoginForm((f) => ({
                            ...f,
                            password: e.currentTarget.value,
                        }))
                    }
                />
            </div>
            <FieldError for={inputId('password')} errors={errors().password} />

            <button
                type="submit"
                class="btn btn-form"
                disabled={isDisabled()}
                aria-busy={isDisabled()}
            >
                {isDisabled()
                    ? i18n.t('loading', 'Loading…')
                    : t('form.submit', 'SUBMIT')}
            </button>
        </form>
    );
}
