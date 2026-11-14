import { createResource, createSignal } from 'solid-js';
import { createSubmit } from '@shared/api/submit';
import { usePageMeta } from '@shared/meta/page-meta';
import { useAuth } from '@shared/api/auth-provider';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import ErrorSummary from '@shared/ui/ErrorSummary';
import PageHeader from '@shared/ui/PageHeader';
import { listSessions, revokeAllSessions, revokeSession } from './api';
import SessionsTable from './components/SessionsTable';

/** The signed-in user's sessions, fetched by this page only. */
export default function SessionsPage() {
    const { isAuthenticated } = useAuth();
    const t = useLocalizer('sessions');

    usePageMeta(() => ({
        title: t('title', 'Sessions'),
        description: t('description', 'List of current active sessions.'),
    }));

    const [sessions, { refetch }] = createResource(
        isAuthenticated,
        listSessions
    );
    // One session's failure shows above the list; revoking all shows its
    // own in the confirm dialog, which stays open.
    const one = createSubmit();
    const all = createSubmit();
    const [confirming, setConfirming] = createSignal(false);
    const isLoading = () => one.busy() || all.busy() || sessions.loading;

    function revoke(id: string) {
        return one.run(
            () => revokeSession(id),
            () => refetch()
        );
    }

    function revokeAll() {
        return all.run(revokeAllSessions, async () => {
            setConfirming(false);
            await refetch();
        });
    }

    function cancel() {
        setConfirming(false);
        all.setErrors({});
    }

    return (
        <div class="page-stack">
            <PageHeader
                eyebrow={t('nav.settings', 'Settings')}
                title={t('heading', 'Active sessions')}
                description={t(
                    'lead',
                    'The devices signed in to your account.'
                )}
                docs="sessions"
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
            <ErrorSummary errors={one.errors()} />
            <SessionsTable
                sessions={sessions() ?? []}
                busy={isLoading()}
                onRevoke={(id) => void revoke(id)}
            />

            <ConfirmDialog
                open={confirming()}
                title={t('confirm_revoke_all.title', 'Revoke every session?')}
                confirm={t('revoke_all', 'Revoke all')}
                busy={all.busy()}
                errors={all.errors()}
                onConfirm={() => void revokeAll()}
                onCancel={cancel}
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
