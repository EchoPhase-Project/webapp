import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import Field from '@shared/ui/forms/Field';
import { createForm } from '@shared/ui/forms/form';
import { changePasswordMutation } from '@features/profile/api';

/**
 * A new password: the current one, the new one twice (compared here, the
 * rules are the server's). Every other device is signed out; this one stays.
 */
export default function PasswordForm() {
    const t = useLocalizer('profile');
    const form = createForm({
        id: 'password',
        initial: () => ({ currentPassword: '', newPassword: '', confirm: '' }),
        check: (v) =>
            v.newPassword !== v.confirm && {
                confirm: t('password.differ', 'The two new passwords differ.'),
            },
    });
    const changing = form.mutation(changePasswordMutation);

    const save = form.onSubmit((v) =>
        changing.run(
            { currentPassword: v.currentPassword, newPassword: v.newPassword },
            () => form.reset()
        )
    );

    return (
        <form class="vert-form" onSubmit={save} noValidate>
            <ErrorSummary {...form.summary} />
            <Field
                {...form.input('currentPassword')}
                label={t('password.current', 'Current password')}
                showLabel
                type="password"
                autocomplete="current-password"
            />
            <Field
                {...form.input('newPassword')}
                label={t('password.new', 'New password')}
                showLabel
                type="password"
                autocomplete="new-password"
            />
            <Field
                {...form.input('confirm')}
                label={t('password.confirm', 'New password again')}
                showLabel
                type="password"
                autocomplete="new-password"
            />
            <div class="actions-row">
                <Button
                    type="submit"
                    busy={form.busy()}
                    disabled={!form.filled()}
                >
                    {t('password.save', 'Change password')}
                </Button>
                <span class="muted" role="status">
                    {form.done()
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
