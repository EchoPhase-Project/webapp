import { DateHelper } from '@shared/lib/date-helper';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import Field from '@shared/ui/forms/Field';
import { createForm } from '@shared/ui/forms/form';
import { createApiClientMutation } from '@features/api-clients/api';

/** A new API client: its name and an optional expiry; hands back the secret. */
export default function ApiClientForm(props: {
    onCreated: (secret: string) => void;
}) {
    const t = useLocalizer('api-clients');
    // expiresAt: a datetime-local value (the browser's local time),
    // converted on submit.
    const form = createForm({
        id: 'api-client',
        initial: () => ({ name: '', expiresAt: '' }),
    });
    const createClient = form.mutation(createApiClientMutation);

    const create = form.onSubmit((v) =>
        createClient.run(
            { name: v.name, expiresAt: DateHelper.fromLocalInput(v.expiresAt) },
            (client) => props.onCreated(client.clientSecret)
        )
    );

    return (
        <form class="vert-form" onSubmit={create} noValidate>
            <ErrorSummary {...form.summary} />

            <Field
                {...form.input('name')}
                label={t('ui.name', 'Name')}
                showLabel
                type="text"
                maxLength={64}
            />

            <Field
                {...form.input('expiresAt')}
                label={t('form.expires', 'Expires (optional, your local time)')}
                showLabel
                type="datetime-local"
                min={DateHelper.toLocalInput(new Date())}
            />

            <Button type="submit" busy={form.busy()}>
                {t('form.create', 'Create')}
            </Button>
        </form>
    );
}
