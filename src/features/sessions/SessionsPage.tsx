import { createRenderEffect, createResource, createSignal } from 'solid-js';
import { useRootMeta } from '@shared/meta/page-meta';
import { useAuth } from '@shared/api/auth-provider';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
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
            <div class="page-header">
                <h1>{t('heading', 'Active Sessions')}</h1>
                <Button
                    disabled={isLoading() || (sessions() ?? []).length === 0}
                    onClick={() => void revoking(revokeAllSessions)}
                >
                    {t('revoke_all', 'Revoke All')}
                </Button>
            </div>
            <SessionsTable
                sessions={sessions() ?? []}
                busy={isLoading()}
                onRevoke={(id) => void revoking(() => revokeSession(id))}
            />
        </div>
    );
}
