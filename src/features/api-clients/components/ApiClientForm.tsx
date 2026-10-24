import { createSignal } from 'solid-js';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import { DateHelper } from '@shared/lib/date-helper';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Field from '@shared/ui/Field';
import { createApiClient } from '@features/api-clients/api';

const FIELDS = ['name', 'expiresAt'] as const;
const inputId = (field: string) => `api-client-${field}`;

/** A new API client: its name and an optional expiry; hands back the secret. */
export default function ApiClientForm(props: {
    onCreated: (secret: string) => void;
}) {
    const t = useLocalizer('api-clients');
    const [name, setName] = createSignal('');
    // datetime-local value: the browser's local time, converted on submit.
    const [expiresAt, setExpiresAt] = createSignal('');
    const [errors, setErrors] = createSignal<FormErrors>({});
    const [busy, setBusy] = createSignal(false);

    async function create(e: Event) {
        e.preventDefault();
        setBusy(true);
        try {
            const result = await createApiClient({
                name: name(),
                expiresAt: DateHelper.fromLocalInput(expiresAt()),
            });
            if (!result.ok) {
                setErrors(groupErrors(result.errors, FIELDS));
                return;
            }
            setErrors({});
            setName('');
            setExpiresAt('');
            props.onCreated(result.data.clientSecret);
        } finally {
            setBusy(false);
        }
    }

    return (
        <form class="vert-form" onSubmit={(e) => void create(e)} noValidate>
            <ErrorSummary errors={errors()} inputId={inputId} />

            <Field
                id={inputId('name')}
                name="name"
                label={t('form.name', 'Name')}
                showLabel
                errors={errors().name}
                type="text"
                maxLength={64}
                disabled={busy()}
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
            />

            <Field
                id={inputId('expiresAt')}
                name="expiresAt"
                label={t('form.expires', 'Expires (optional, your local time)')}
                showLabel
                errors={errors().expiresAt}
                type="datetime-local"
                min={DateHelper.toLocalInput(new Date())}
                disabled={busy()}
                value={expiresAt()}
                onInput={(e) => setExpiresAt(e.currentTarget.value)}
            />

            <Button type="submit" busy={busy()}>
                {t('form.create', 'Create')}
            </Button>
        </form>
    );
}
