import { createSignal } from 'solid-js';
import { A } from '@solidjs/router';
import { FaRegularUser } from 'solid-icons/fa';
import { BiRegularLock } from 'solid-icons/bi';
import { AiOutlineTags } from 'solid-icons/ai';
import { groupErrors } from '@shared/api/errors';
import { useAuth } from '@shared/api/auth-provider';
import type { FormErrors } from '@shared/api/errors';
import type { RegisterData } from '@shared/api/types';
import { DateHelper } from '@shared/lib/date-helper';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Button from '@shared/ui/Button';
import Field from '@shared/ui/Field';

const FIELDS = ['name', 'username', 'password'] as const;
const inputId = (field: string) => `register-${field}`;

export default function RegisterForm(props: { onSwitch: () => void }) {
    const [registerForm, setRegisterForm] = createSignal<RegisterData>({
        name: '',
        username: '',
        password: '',
    });

    const [errors, setErrors] = createSignal<FormErrors>({});
    const auth = useAuth();

    const i18n = useI18n();
    const t = useLocalizer('auth');
    const isDisabled = () => auth.isLoading() || i18n.isLoading();

    async function handleRegister(e: Event) {
        e.preventDefault();

        // The zone is the browser's, not a field: the user can change it later.
        const result = await auth.register({
            ...registerForm(),
            timeZone: DateHelper.browserTimeZone(),
        });

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
            onSubmit={(e) => void handleRegister(e)}
            noValidate
        >
            <h1 class="form-title">{t('signup.title', 'Sign up')}</h1>

            <ErrorSummary errors={errors()} inputId={inputId} />

            <Field
                id={inputId('name')}
                name="name"
                label={t('form.fullname', 'Full name')}
                icon={FaRegularUser}
                errors={errors().name}
                type="text"
                autocomplete="name"
                disabled={isDisabled()}
                value={registerForm().name}
                onInput={(e) =>
                    setRegisterForm((f) => ({
                        ...f,
                        name: e.currentTarget.value,
                    }))
                }
            />

            <Field
                id={inputId('username')}
                name="username"
                label={t('form.username', 'Username')}
                icon={AiOutlineTags}
                errors={errors().username}
                type="text"
                autocomplete="username"
                disabled={isDisabled()}
                value={registerForm().username}
                onInput={(e) =>
                    setRegisterForm((f) => ({
                        ...f,
                        username: e.currentTarget.value,
                    }))
                }
            />

            <Field
                id={inputId('password')}
                name="password"
                label={t('form.password', 'Password')}
                icon={BiRegularLock}
                errors={errors().password}
                type="password"
                autocomplete="new-password"
                disabled={isDisabled()}
                value={registerForm().password}
                onInput={(e) =>
                    setRegisterForm((f) => ({
                        ...f,
                        password: e.currentTarget.value,
                    }))
                }
            />

            <Button type="submit" busy={isDisabled()}>
                {isDisabled()
                    ? i18n.t('loading', 'Loading…')
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
                <button
                    type="button"
                    class="link-button"
                    onClick={() => props.onSwitch()}
                >
                    {t('signup.switch', 'Log in')}
                </button>
            </p>
        </form>
    );
}
