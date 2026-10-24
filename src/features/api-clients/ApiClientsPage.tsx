import {
    createRenderEffect,
    createResource,
    createSignal,
    Show,
    type Component,
} from 'solid-js';
import { AiOutlineClose } from 'solid-icons/ai';
import { useRootMeta } from '@shared/meta/page-meta';
import { api, send, untyped } from '@shared/api/client';
import { groupErrors } from '@shared/api/errors';
import { useAuth } from '@shared/api/auth-provider';
import type { ApiClient, CreatedApiClient } from '@shared/api/types';
import type { FormErrors } from '@shared/api/errors';
import { DateHelper } from '@shared/lib/date-helper';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import { Table, Cell, Row } from '@shared/ui/Table';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Field from '@shared/ui/Field';
import './api-clients.scss';

const FIELDS = ['name', 'expiresAt'] as const;
const COLUMNS = ['name', 'expires', 'last_used', 'created', 'actions'] as const;
const COLUMN_TEXT: Record<(typeof COLUMNS)[number], string> = {
    name: 'Name',
    expires: 'Expires',
    last_used: 'Last used',
    created: 'Created',
    actions: 'Actions',
};
const inputId = (field: string) => `api-client-${field}`;

const NoClientsPlaceholder: Component = () => {
    const t = useLocalizer('api-clients');
    return <>{t('empty', 'No API clients')}</>;
};

export default function ApiClientsPage() {
    const { setTitle, setDescription } = useRootMeta();
    const { user, isAuthenticated } = useAuth();
    const i18n = useI18n();
    const t = useLocalizer('api-clients');

    createRenderEffect(() => {
        setTitle(`${t('title', 'API clients')} · EchoPhase`);
        setDescription(
            t(
                'description',
                'Credentials for bots and scripts that call the API.'
            )
        );
    });

    const [clients, { refetch }] = createResource(
        isAuthenticated,
        async (): Promise<ApiClient[]> => {
            const result = untyped<ApiClient[]>(
                await send(api.GET('/api/v1/api-clients'))
            );
            return result.ok ? result.data : [];
        }
    );

    const [name, setName] = createSignal('');
    // datetime-local value: the browser's local time, converted on submit.
    const [expiresAt, setExpiresAt] = createSignal('');
    const [errors, setErrors] = createSignal<FormErrors>({});
    const [secret, setSecret] = createSignal<string | null>(null);
    const [busy, setBusy] = createSignal(false);

    const column = (c: (typeof COLUMNS)[number]) =>
        t(`columns.${c}`, COLUMN_TEXT[c]);

    // Times show in the profile's zone, so they read the same on any device.
    const show = (iso: string | null) =>
        DateHelper.format(iso, user()?.timeZone, i18n.currentLocale()) || '—';

    async function create(e: Event) {
        e.preventDefault();
        setBusy(true);
        setSecret(null);
        try {
            const result = untyped<CreatedApiClient>(
                await send(
                    api.POST('/api/v1/api-clients', {
                        // The API takes moments with Z or an offset only: send UTC.
                        body: {
                            name: name(),
                            expiresAt: DateHelper.fromLocalInput(expiresAt()),
                        },
                    })
                )
            );
            if (!result.ok) {
                setErrors(groupErrors(result.errors, FIELDS));
                return;
            }
            setErrors({});
            setName('');
            setExpiresAt('');
            setSecret(result.data.clientSecret);
            await refetch();
        } finally {
            setBusy(false);
        }
    }

    async function remove(id: string) {
        setBusy(true);
        try {
            await send(
                api.DELETE('/api/v1/api-clients/{id}', {
                    params: { path: { id } },
                })
            );
            await refetch();
        } finally {
            setBusy(false);
        }
    }

    return (
        <div class="api-clients-container">
            <h1>{t('title', 'API clients')}</h1>

            <form
                class="card vert-form api-client-form"
                onSubmit={(e) => void create(e)}
                noValidate
            >
                <h4 class="form-title">{t('form.title', 'New client')}</h4>
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
                    label={t(
                        'form.expires',
                        'Expires (optional, your local time)'
                    )}
                    showLabel
                    errors={errors().expiresAt}
                    type="datetime-local"
                    min={DateHelper.toLocalInput(new Date())}
                    disabled={busy()}
                    value={expiresAt()}
                    onInput={(e) => setExpiresAt(e.currentTarget.value)}
                />

                <button class="btn" type="submit" disabled={busy()}>
                    {t('form.create', 'Create')}
                </button>
            </form>

            <Show when={secret()}>
                <p class="card api-client-secret" role="status">
                    {t('secret', 'Secret (shown once, copy it now):')}{' '}
                    <code>{secret()}</code>
                </p>
            </Show>

            <Table
                data={clients() ?? []}
                headers={COLUMNS.map((c) => column(c))}
                placeholder={NoClientsPlaceholder}
                tableProps={{ class: 'api-clients' }}
                render={({ item: client }) => (
                    <Row>
                        <Cell label={column('name')} text={client.Name} />
                        <Cell
                            label={column('expires')}
                            text={show(client.ExpiresAt)}
                        />
                        <Cell
                            label={column('last_used')}
                            text={show(client.LastUsedAt)}
                        />
                        <Cell
                            label={column('created')}
                            text={show(client.CreatedAt)}
                        />
                        <Cell
                            label={column('actions')}
                            props={{ class: 'actions' }}
                        >
                            <button
                                class="btn btn-icon"
                                aria-label={t(
                                    'delete',
                                    'Delete {name}'
                                ).replace('{name}', client.Name)}
                                disabled={busy()}
                                onClick={() => void remove(client.Id)}
                            >
                                <AiOutlineClose />
                            </button>
                        </Cell>
                    </Row>
                )}
            />
        </div>
    );
}
