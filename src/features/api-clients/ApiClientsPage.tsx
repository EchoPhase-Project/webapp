import { createSignal, Match, Show, Switch } from 'solid-js';
import { useQuery } from '@tanstack/solid-query';
import { IconPlus } from '@shared/ui/icons';
import { usePageMeta } from '@shared/meta/page-meta';
import { createSubmit } from '@shared/api/submit';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import LoadError from '@shared/ui/LoadError';
import Modal from '@shared/ui/Modal';
import PageHeader from '@shared/ui/PageHeader';
import type { ApiClient } from '@shared/api/types';
import { apiClientsQuery, deleteApiClientMutation } from './api';
import ApiClientForm from './components/ApiClientForm';
import ApiClientsTable from './components/ApiClientsTable';
import SecretNotice from './components/SecretNotice';
import './api-clients.scss';

/** The signed-in user's API clients: the list, a new one in a dialog. */
export default function ApiClientsPage() {
    const t = useLocalizer('api-clients');

    usePageMeta(() => ({
        title: t('title', 'API clients'),
        description: t(
            'description',
            'Credentials for bots and scripts that call the API.'
        ),
    }));

    const clients = useQuery(() => apiClientsQuery());
    const [creating, setCreating] = createSignal(false);
    const [secret, setSecret] = createSignal<string | null>(null);
    const { busy, errors, setErrors, mutation } = createSubmit();
    const deleteClient = mutation(deleteApiClientMutation);
    // The client whose deletion waits for a yes.
    const [deleting, setDeleting] = createSignal<ApiClient | null>(null);

    function created(value: string) {
        setCreating(false);
        setSecret(value);
    }

    // A failure shows in the dialog, which stays open.
    function remove(client: ApiClient) {
        return deleteClient.run(client.Id, () => setDeleting(null));
    }

    function cancel() {
        setDeleting(null);
        setErrors({});
    }

    return (
        <div class="page-stack">
            <PageHeader
                eyebrow={t('nav.settings', 'Settings')}
                title={t('title', 'API clients')}
                description={t(
                    'description',
                    'Credentials for bots and scripts that call the API.'
                )}
                actions={
                    <Button onClick={() => setCreating(true)}>
                        <IconPlus />
                        {t('new', 'New client')}
                    </Button>
                }
            />

            <Show when={secret()}>
                {(value) => (
                    <SecretNotice
                        secret={value()}
                        onDismiss={() => setSecret(null)}
                    />
                )}
            </Show>

            <Switch>
                <Match when={clients.isError && clients.error}>
                    {(error) => (
                        <LoadError
                            error={error()}
                            busy={clients.isFetching}
                            onRetry={() => clients.refetch()}
                        />
                    )}
                </Match>
                <Match when={clients.isSuccess}>
                    <ApiClientsTable
                        clients={clients.data ?? []}
                        busy={busy()}
                        onDelete={setDeleting}
                    />
                </Match>
            </Switch>

            <Modal
                open={creating()}
                title={t('form.title', 'New client')}
                onClose={() => setCreating(false)}
            >
                <ApiClientForm onCreated={created} />
            </Modal>

            <ConfirmDialog
                item={deleting()}
                title={t('confirm_delete.title', 'Delete this API client?')}
                confirm={t('ui.delete', 'Delete')}
                busy={busy()}
                errors={errors()}
                onConfirm={(client) => void remove(client)}
                onCancel={cancel}
            >
                {(client) => (
                    <p>
                        {t(
                            'confirm_delete.text',
                            '{name} stops working at once: bots and scripts using it can no longer sign in.',
                            { name: client.Name }
                        )}
                    </p>
                )}
            </ConfirmDialog>
        </div>
    );
}
