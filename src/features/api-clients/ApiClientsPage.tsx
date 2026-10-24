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
import Modal from '@shared/ui/Modal';
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

    function created(value: string) {
        setCreating(false);
        setSecret(value);
        void refetch();
    }

    async function remove(id: string) {
        setBusy(true);
        try {
            await deleteApiClient(id);
            await refetch();
        } finally {
            setBusy(false);
        }
    }

    return (
        <div class="api-clients-container">
            <div class="page-header">
                <h1>{t('title', 'API clients')}</h1>
                <Button onClick={() => setCreating(true)}>
                    <AiOutlinePlus />
                    {t('new', 'New client')}
                </Button>
            </div>

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
                onDelete={(id) => void remove(id)}
            />

            <Modal
                open={creating()}
                title={t('form.title', 'New client')}
                onClose={() => setCreating(false)}
            >
                <ApiClientForm onCreated={created} />
            </Modal>
        </div>
    );
}
