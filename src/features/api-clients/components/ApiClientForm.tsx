import { createSignal } from 'solid-js';
import { createSubmit } from '@shared/api/submit';
import { DateHelper } from '@shared/lib/date-helper';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import Field from '@shared/ui/forms/Field';
import { createApiClientMutation } from '@features/api-clients/api';

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
    const { busy, errors, mutation } = createSubmit(FIELDS);
    const createClient = mutation(createApiClientMutation);

    async function create(e: Event) {
        e.preventDefault();
        await createClient.run(
            {
                name: name(),
                expiresAt: DateHelper.fromLocalInput(expiresAt()),
            },
            (client) => {
                setName('');
                setExpiresAt('');
                props.onCreated(client.clientSecret);
            }
        );
    }

    return (
        <form class="vert-form" onSubmit={(e) => void create(e)} noValidate>
            <ErrorSummary errors={errors()} inputId={inputId} />

            <Field
                id={inputId('name')}
                name="name"
                label={t('ui.name', 'Name')}
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
