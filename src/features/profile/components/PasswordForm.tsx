import { createSignal } from 'solid-js';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Field from '@shared/ui/Field';
import { changePassword } from '@features/profile/api';

const FIELDS = ['currentPassword', 'newPassword', 'confirm'] as const;
const inputId = (field: string) => `password-${field}`;

/**
 * A new password: the current one, the new one twice (compared here, the
 * rules are the server's). Every other device is signed out; this one stays.
 */
export default function PasswordForm() {
    const t = useLocalizer('profile');
    const [current, setCurrent] = createSignal('');
    const [next, setNext] = createSignal('');
    const [confirm, setConfirm] = createSignal('');
    const [errors, setErrors] = createSignal<FormErrors>({});
    const [busy, setBusy] = createSignal(false);
    const [done, setDone] = createSignal(false);

    const edited =
        (set: (value: string) => void) =>
        (e: { currentTarget: HTMLInputElement }) => {
            set(e.currentTarget.value);
            setDone(false);
        };

    async function save(e: Event) {
        e.preventDefault();
        if (next() !== confirm()) {
            setErrors({
                confirm: [
                    {
                        code: 'PasswordsDiffer',
                        message: t(
                            'password.differ',
                            'The two new passwords differ.'
                        ),
                        field: 'confirm',
                    },
                ],
            });
            return;
        }
        setBusy(true);
        try {
            const result = await changePassword({
                currentPassword: current(),
                newPassword: next(),
            });
            if (!result.ok) {
                setErrors(groupErrors(result.errors, FIELDS));
                return;
            }
            setErrors({});
            setCurrent('');
            setNext('');
            setConfirm('');
            setDone(true);
        } finally {
            setBusy(false);
        }
    }

    return (
        <form class="vert-form" onSubmit={(e) => void save(e)} noValidate>
            <ErrorSummary errors={errors()} inputId={inputId} />
            <Field
                id={inputId('currentPassword')}
                name="currentPassword"
                label={t('password.current', 'Current password')}
                showLabel
                errors={errors().currentPassword}
                type="password"
                autocomplete="current-password"
                disabled={busy()}
                value={current()}
                onInput={edited(setCurrent)}
            />
            <Field
                id={inputId('newPassword')}
                name="newPassword"
                label={t('password.new', 'New password')}
                showLabel
                errors={errors().newPassword}
                type="password"
                autocomplete="new-password"
                disabled={busy()}
                value={next()}
                onInput={edited(setNext)}
            />
            <Field
                id={inputId('confirm')}
                name="confirm"
                label={t('password.confirm', 'New password again')}
                showLabel
                errors={errors().confirm}
                type="password"
                autocomplete="new-password"
                disabled={busy()}
                value={confirm()}
                onInput={edited(setConfirm)}
            />
            <div class="profile-form-actions">
                <Button
                    type="submit"
                    busy={busy()}
                    disabled={!current() || !next() || !confirm()}
                >
                    {t('password.save', 'Change password')}
                </Button>
                <span class="muted" role="status">
                    {done()
                        ? t(
                              'password.done',
                              'Changed. Your other devices are signed out.'
                          )
                        : ''}
                </span>
            </div>
        </form>
    );
}
