import { useQuery } from '@tanstack/solid-query';
import { createSubmit } from '@shared/api/submit';
import { usePageMeta } from '@shared/meta/page-meta';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog, { createConfirm } from '@shared/ui/ConfirmDialog';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import PageHeader from '@shared/ui/PageHeader';
import QueryState from '@shared/ui/QueryState';
import {
    revokeAllSessionsMutation,
    revokeSessionMutation,
    sessionsQuery,
} from './api';
import SessionsTable from './components/SessionsTable';

/** The signed-in user's sessions, fetched by this page only. */
export default function SessionsPage() {
    const t = useLocalizer('sessions');

    usePageMeta(() => ({
        title: t('title', 'Sessions'),
        description: t('description', 'List of current active sessions.'),
    }));

    const sessions = useQuery(() => sessionsQuery());
    // One session's failure shows above the list; revoking all shows its
    // own in the confirm dialog, which stays open.
    const one = createSubmit();
    const revokeOne = one.mutation(revokeSessionMutation);
    // Success ends the session: the page goes with it.
    const all = createConfirm(revokeAllSessionsMutation, (_: 'all') => {});
    const isLoading = () => one.busy() || all.busy() || sessions.isPending;

    function revoke(id: string) {
        return revokeOne.run(id);
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
                            isLoading() || (sessions.data ?? []).length === 0
                        }
                        onClick={() => all.ask('all')}
                    >
                        {t('revoke_all', 'Revoke all')}
                    </Button>
                }
            />
            <ErrorSummary errors={one.errors()} />
            {/* While the list loads, the table shows rows of bars. */}
            <QueryState query={sessions} placeholder={[]}>
                {(list) => (
                    <SessionsTable
                        sessions={list()}
                        busy={isLoading()}
                        onRevoke={(id) => void revoke(id)}
                    />
                )}
            </QueryState>

            <ConfirmDialog
                {...all.dialog}
                title={t('confirm_revoke_all.title', 'Revoke every session?')}
                confirm={t('revoke_all', 'Revoke all')}
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
