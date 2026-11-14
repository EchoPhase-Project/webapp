import { createResource, createSignal, Show } from 'solid-js';
import { IconPlus } from '@shared/ui/icons';
import { usePageMeta } from '@shared/meta/page-meta';
import { useAuth } from '@shared/api/auth-provider';
import { createSubmit } from '@shared/api/submit';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import Modal from '@shared/ui/Modal';
import PageHeader from '@shared/ui/PageHeader';
import type { ApiClient } from '@shared/api/types';
import { deleteApiClient, listApiClients } from './api';
import ApiClientForm from './components/ApiClientForm';
import ApiClientsTable from './components/ApiClientsTable';
import SecretNotice from './components/SecretNotice';
import './api-clients.scss';

/** The signed-in user's API clients: the list, a new one in a dialog. */
export default function ApiClientsPage() {
    const { isAuthenticated } = useAuth();
    const t = useLocalizer('api-clients');

    usePageMeta(() => ({
        title: t('title', 'API clients'),
        description: t(
            'description',
            'Credentials for bots and scripts that call the API.'
        ),
    }));

    const [clients, { refetch }] = createResource(
        isAuthenticated,
        listApiClients
    );
    const [creating, setCreating] = createSignal(false);
    const [secret, setSecret] = createSignal<string | null>(null);
    const { busy, errors, setErrors, run } = createSubmit();
    // The client whose deletion waits for a yes.
    const [deleting, setDeleting] = createSignal<ApiClient | null>(null);

    function created(value: string) {
        setCreating(false);
        setSecret(value);
        void refetch();
    }

    // A failure shows in the dialog, which stays open.
    function remove(client: ApiClient) {
        return run(
            () => deleteApiClient(client.Id),
            async () => {
                setDeleting(null);
                await refetch();
            }
        );
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

            <ApiClientsTable
                clients={clients() ?? []}
                busy={busy()}
                onDelete={setDeleting}
            />

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
