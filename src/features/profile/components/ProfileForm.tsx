import { updateProfileMutation } from '@shared/api/auth';
import type { User } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import Field from '@shared/ui/forms/Field';
import TimeZoneField from '@shared/ui/forms/TimeZoneField';
import { createForm, orNull } from '@shared/ui/forms/form';

/** The name, username and time zone; sends only what changed. */
export default function ProfileForm(props: { user: User }) {
    const t = useLocalizer('profile');
    // A field the user did not change follows the saved user.
    const form = createForm({
        id: 'profile',
        initial: () => ({
            name: props.user.name,
            username: props.user.userName ?? '',
            timeZone: props.user.timeZone,
        }),
    });
    const updateProfile = form.mutation(updateProfileMutation);

    const save = form.onSubmit(() => {
        const changed = form.changed();
        return updateProfile.run({
            name: orNull(changed.name),
            username: orNull(changed.username),
            timeZone: orNull(changed.timeZone),
        });
    });

    return (
        <form class="vert-form" onSubmit={save} noValidate>
            <ErrorSummary {...form.summary} />

            <Field
                {...form.input('name')}
                label={t('details.name', 'Display name')}
                showLabel
                type="text"
                autocomplete="name"
                minLength={2}
                maxLength={64}
            />

            <Field
                {...form.input('username')}
                label={t(
                    'details.username',
                    'Username (letters and digits; you sign in with it)'
                )}
                showLabel
                type="text"
                autocomplete="username"
                spellcheck={false}
                maxLength={64}
            />

            <TimeZoneField
                {...form.control('timeZone')}
                label={t('ui.time_zone', 'Time zone')}
                showLabel
            />

            <div class="actions-row">
                <Button
                    type="submit"
                    busy={form.busy()}
                    disabled={!form.dirty()}
                >
                    {t('ui.save', 'Save')}
                </Button>
                <span class="muted" role="status">
                    {form.done() ? t('details.saved', 'Saved') : ''}
                </span>
            </div>
        </form>
    );
}
