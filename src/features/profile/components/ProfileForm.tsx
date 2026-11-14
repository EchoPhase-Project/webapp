import { createSignal } from 'solid-js';
import { updateProfileMutation, useResultMutation } from '@shared/api/auth';
import { createSubmit } from '@shared/api/submit';
import type { User } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Field from '@shared/ui/Field';
import TimeZoneField from '@shared/ui/TimeZoneField';

const FIELDS = ['name', 'username', 'timeZone'] as const;
const inputId = (field: string) => `profile-${field}`;

/** The name, username and time zone; sends only what changed. */
export default function ProfileForm(props: { user: User }) {
    const updateProfile = useResultMutation(updateProfileMutation);
    const t = useLocalizer('profile');
    // Seeded once: the user is in the props, edits stay local until saved.
    // eslint-disable-next-line solid/reactivity
    const [name, setName] = createSignal(props.user.name);
    // eslint-disable-next-line solid/reactivity
    const [username, setUsername] = createSignal(props.user.userName ?? '');
    // eslint-disable-next-line solid/reactivity
    const [timeZone, setTimeZone] = createSignal(props.user.timeZone);
    const { busy, errors, run } = createSubmit(FIELDS);
    const [saved, setSaved] = createSignal(false);

    const changed = () =>
        name().trim() !== props.user.name ||
        username().trim() !== (props.user.userName ?? '') ||
        timeZone().trim() !== props.user.timeZone;

    async function save(e: Event) {
        e.preventDefault();
        setSaved(false);
        await run(
            () =>
                updateProfile({
                    name:
                        name().trim() !== props.user.name
                            ? name().trim()
                            : null,
                    username:
                        username().trim() !== (props.user.userName ?? '')
                            ? username().trim()
                            : null,
                    timeZone:
                        timeZone().trim() !== props.user.timeZone
                            ? timeZone().trim()
                            : null,
                }),
            () => setSaved(true)
        );
    }

    return (
        <form class="vert-form" onSubmit={(e) => void save(e)} noValidate>
            <ErrorSummary errors={errors()} inputId={inputId} />

            <Field
                id={inputId('name')}
                name="name"
                label={t('details.name', 'Display name')}
                showLabel
                errors={errors().name}
                type="text"
                autocomplete="name"
                minLength={2}
                maxLength={64}
                disabled={busy()}
                value={name()}
                onInput={(e) => {
                    setName(e.currentTarget.value);
                    setSaved(false);
                }}
            />

            <Field
                id={inputId('username')}
                name="username"
                label={t(
                    'details.username',
                    'Username (letters and digits; you sign in with it)'
                )}
                showLabel
                errors={errors().username}
                type="text"
                autocomplete="username"
                spellcheck={false}
                maxLength={64}
                disabled={busy()}
                value={username()}
                onInput={(e) => {
                    setUsername(e.currentTarget.value);
                    setSaved(false);
                }}
            />

            <TimeZoneField
                id={inputId('timeZone')}
                name="timeZone"
                label={t('ui.time_zone', 'Time zone')}
                showLabel
                errors={errors().timeZone}
                disabled={busy()}
                value={timeZone()}
                onInput={(e) => {
                    setTimeZone(e.currentTarget.value);
                    setSaved(false);
                }}
            />

            <div class="actions-row">
                <Button type="submit" busy={busy()} disabled={!changed()}>
                    {t('ui.save', 'Save')}
                </Button>
                <span class="muted" role="status">
                    {saved() ? t('details.saved', 'Saved') : ''}
                </span>
            </div>
        </form>
    );
}
