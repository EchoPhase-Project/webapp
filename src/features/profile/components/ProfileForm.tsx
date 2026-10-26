import { createSignal, For } from 'solid-js';
import { useAuth } from '@shared/api/auth-provider';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import type { User } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Field from '@shared/ui/Field';

const FIELDS = ['name', 'username', 'timeZone'] as const;
const inputId = (field: string) => `profile-${field}`;

// The browser's IANA zones, offered as suggestions (the server checks).
const zones = (): string[] => {
    try {
        return Intl.supportedValuesOf('timeZone');
    } catch {
        return [];
    }
};

/** The name, username and time zone; sends only what changed. */
export default function ProfileForm(props: { user: User }) {
    const { updateProfile } = useAuth();
    const t = useLocalizer('profile');
    // Seeded once: the user is in the props, edits stay local until saved.
    // eslint-disable-next-line solid/reactivity
    const [name, setName] = createSignal(props.user.name);
    // eslint-disable-next-line solid/reactivity
    const [username, setUsername] = createSignal(props.user.userName ?? '');
    // eslint-disable-next-line solid/reactivity
    const [timeZone, setTimeZone] = createSignal(props.user.timeZone);
    const [errors, setErrors] = createSignal<FormErrors>({});
    const [busy, setBusy] = createSignal(false);
    const [saved, setSaved] = createSignal(false);

    const changed = () =>
        name().trim() !== props.user.name ||
        username().trim() !== (props.user.userName ?? '') ||
        timeZone().trim() !== props.user.timeZone;

    async function save(e: Event) {
        e.preventDefault();
        setBusy(true);
        setSaved(false);
        try {
            const outcome = await updateProfile({
                name: name().trim() !== props.user.name ? name().trim() : null,
                username:
                    username().trim() !== (props.user.userName ?? '')
                        ? username().trim()
                        : null,
                timeZone:
                    timeZone().trim() !== props.user.timeZone
                        ? timeZone().trim()
                        : null,
            });
            if (!outcome.success) {
                setErrors(groupErrors(outcome.error ?? [], FIELDS));
                return;
            }
            setErrors({});
            setSaved(true);
        } finally {
            setBusy(false);
        }
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

            <Field
                id={inputId('timeZone')}
                name="timeZone"
                label={t('details.time_zone', 'Time zone')}
                showLabel
                errors={errors().timeZone}
                type="text"
                list="profile-time-zones"
                spellcheck={false}
                disabled={busy()}
                value={timeZone()}
                onInput={(e) => {
                    setTimeZone(e.currentTarget.value);
                    setSaved(false);
                }}
            />
            <datalist id="profile-time-zones">
                <For each={zones()}>{(zone) => <option value={zone} />}</For>
            </datalist>

            <div class="profile-form-actions">
                <Button type="submit" busy={busy()} disabled={!changed()}>
                    {t('details.save', 'Save')}
                </Button>
                <span class="muted" role="status">
                    {saved() ? t('details.saved', 'Saved') : ''}
                </span>
            </div>
        </form>
    );
}
