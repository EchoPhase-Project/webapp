import {
    createRenderEffect,
    createResource,
    createSignal,
    Show,
} from 'solid-js';
import { AiOutlinePlus } from 'solid-icons/ai';
import { useRootMeta } from '@shared/meta/page-meta';
import { useAuth } from '@shared/api/auth-provider';
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
    const { setTitle, setDescription } = useRootMeta();
    const { isAuthenticated } = useAuth();
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
        listApiClients
    );
    const [creating, setCreating] = createSignal(false);
    const [secret, setSecret] = createSignal<string | null>(null);
    const [busy, setBusy] = createSignal(false);
    // The client whose deletion waits for a yes.
    const [deleting, setDeleting] = createSignal<ApiClient | null>(null);

    function created(value: string) {
        setCreating(false);
        setSecret(value);
        void refetch();
    }

    async function remove(client: ApiClient) {
        setBusy(true);
        try {
            await deleteApiClient(client.Id);
            await refetch();
        } finally {
            setBusy(false);
            setDeleting(null);
        }
    }

    return (
        <div class="api-clients-container">
            <PageHeader
                eyebrow={t('nav.settings', 'Settings')}
                title={t('title', 'API clients')}
                description={t(
                    'description',
                    'Credentials for bots and scripts that call the API.'
                )}
                actions={
                    <Button onClick={() => setCreating(true)}>
                        <AiOutlinePlus />
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
                open={!!deleting()}
                title={t('confirm_delete.title', 'Delete this API client?')}
                confirm={t('confirm_delete.action', 'Delete')}
                busy={busy()}
                onConfirm={() => void remove(deleting()!)}
                onCancel={() => setDeleting(null)}
            >
                <p>
                    {t(
                        'confirm_delete.text',
                        '{name} stops working at once: bots and scripts using it can no longer sign in.'
                    ).replace('{name}', deleting()?.Name ?? '')}
                </p>
            </ConfirmDialog>
        </div>
    );
}
