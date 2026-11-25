import { createSignal, Show } from 'solid-js';
import { useQuery } from '@tanstack/solid-query';
import { IconPlus } from '@shared/ui/icons';
import { usePageMeta } from '@shared/meta/page-meta';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog, { createConfirm } from '@shared/ui/ConfirmDialog';
import Modal from '@shared/ui/Modal';
import PageHeader from '@shared/ui/PageHeader';
import QueryState from '@shared/ui/QueryState';
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
    // A failure shows in the dialog, which stays open.
    const deletion = createConfirm(
        deleteApiClientMutation,
        (client: ApiClient) => client.id
    );

    function created(value: string) {
        setCreating(false);
        setSecret(value);
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

            <SecretNotice secret={secret()} onDismiss={() => setSecret(null)} />

            <QueryState query={clients} placeholder={[]}>
                {(list) => (
                    <ApiClientsTable
                        clients={list()}
                        busy={deletion.busy() || clients.isPending}
                        onDelete={deletion.ask}
                    />
                )}
            </QueryState>

            <Modal
                open={creating()}
                title={t('form.title', 'New client')}
                onClose={() => setCreating(false)}
            >
                {/* Made again each time it opens: no old values or errors. */}
                <Show when={creating()}>
                    <ApiClientForm onCreated={created} />
                </Show>
            </Modal>

            <ConfirmDialog
                {...deletion.dialog}
                title={t('confirm_delete.title', 'Delete this API client?')}
                confirm={t('ui.delete', 'Delete')}
            >
                {(client) => (
                    <p>
                        {t(
                            'confirm_delete.text',
                            '{name} stops working at once: bots and scripts using it can no longer sign in.',
                            { name: client.name }
                        )}
                    </p>
                )}
            </ConfirmDialog>
        </div>
    );
}
