import { createRenderEffect, createResource, createSignal } from 'solid-js';
import { useRootMeta } from '@shared/meta/page-meta';
import { useAuth } from '@shared/api/auth-provider';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import PageHeader from '@shared/ui/PageHeader';
import { listSessions, revokeAllSessions, revokeSession } from './api';
import SessionsTable from './components/SessionsTable';
import './sessions.scss';

/** The signed-in user's sessions, fetched by this page only. */
export default function SessionsPage() {
    const { setTitle, setDescription } = useRootMeta();
    const { isAuthenticated } = useAuth();
    const t = useLocalizer('sessions');

    createRenderEffect(() => {
        setTitle(`${t('title', 'Sessions')} · EchoPhase`);
        setDescription(t('description', 'List of current active sessions.'));
    });

    const [sessions, { refetch }] = createResource(
        isAuthenticated,
        listSessions
    );
    const [busy, setBusy] = createSignal(false);
    const [confirming, setConfirming] = createSignal(false);
    const isLoading = () => busy() || sessions.loading;

    async function revoking(call: () => Promise<unknown>) {
        setBusy(true);
        try {
            await call();
            await refetch();
        } finally {
            setBusy(false);
        }
    }

    return (
        <div class="sessions-container">
            <PageHeader
                eyebrow={t('nav.settings', 'Settings')}
                title={t('heading', 'Active sessions')}
                description={t(
                    'lead',
                    'The devices signed in to your account.'
                )}
                more={t(
                    'lead_more',
                    'End a session you do not recognise, and change your password if you think someone else has it.'
                )}
                actions={
                    <Button
                        variant="danger-outline"
                        disabled={
                            isLoading() || (sessions() ?? []).length === 0
                        }
                        onClick={() => setConfirming(true)}
                    >
                        {t('revoke_all', 'Revoke all')}
                    </Button>
                }
            />
            <SessionsTable
                sessions={sessions() ?? []}
                busy={isLoading()}
                onRevoke={(id) => void revoking(() => revokeSession(id))}
            />

            <ConfirmDialog
                open={confirming()}
                title={t('confirm_revoke_all.title', 'Revoke every session?')}
                confirm={t('revoke_all', 'Revoke all')}
                busy={busy()}
                onConfirm={() =>
                    void revoking(revokeAllSessions).finally(() =>
                        setConfirming(false)
                    )
                }
                onCancel={() => setConfirming(false)}
            >
                <p>
                    {t(
                        'confirm_revoke_all.text',
                        'Every device is signed out, this one included: you will sign in again.'
                    )}
                </p>
            </ConfirmDialog>
        </div>
    );
}
