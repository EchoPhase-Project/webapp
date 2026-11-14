import { createSignal } from 'solid-js';
import { A } from '@solidjs/router';
import { IconLock, IconTags, IconUser } from '@shared/ui/icons';
import { useAuth } from '@shared/api/auth-provider';
import { createSubmit } from '@shared/api/submit';
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

    const { busy, errors, run } = createSubmit(FIELDS);
    const auth = useAuth();

    const i18n = useI18n();
    const t = useLocalizer('auth');
    const isDisabled = () => busy() || i18n.isLoading();

    // AuthPage takes the user on (to ?next=) once signed in.
    async function handleRegister(e: Event) {
        e.preventDefault();
        // The zone is the browser's, not a field: the user can change it later.
        await run(() =>
            auth.register({
                ...registerForm(),
                timeZone: DateHelper.browserTimeZone(),
            })
        );
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
                icon={IconUser}
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
                label={t('ui.username', 'Username')}
                icon={IconTags}
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
                icon={IconLock}
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
                <Button variant="link" onClick={() => props.onSwitch()}>
                    {t('signup.switch', 'Log in')}
                </Button>
            </p>
        </form>
    );
}
