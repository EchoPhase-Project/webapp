import { createSignal, Match, Switch } from 'solid-js';
import { useQuery } from '@tanstack/solid-query';
import { createSubmit } from '@shared/api/submit';
import { usePageMeta } from '@shared/meta/page-meta';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import ErrorSummary from '@shared/ui/ErrorSummary';
import LoadError from '@shared/ui/LoadError';
import PageHeader from '@shared/ui/PageHeader';
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
    const all = createSubmit();
    const revokeOne = one.mutation(revokeSessionMutation);
    const revokeEvery = all.mutation(revokeAllSessionsMutation);
    const [confirming, setConfirming] = createSignal(false);
    const isLoading = () => one.busy() || all.busy() || sessions.isPending;

    function revoke(id: string) {
        return revokeOne.run(id);
    }

    // Success ends the session: the page goes with it.
    function revokeAll() {
        return revokeEvery.run(undefined, () => setConfirming(false));
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
                            isLoading() || (sessions.data ?? []).length === 0
                        }
                        onClick={() => setConfirming(true)}
                    >
                        {t('revoke_all', 'Revoke all')}
                    </Button>
                }
            />
            <ErrorSummary errors={one.errors()} />
            <Switch>
                <Match when={sessions.isError && sessions.error}>
                    {(error) => (
                        <LoadError
                            error={error()}
                            busy={sessions.isFetching}
                            onRetry={() => sessions.refetch()}
                        />
                    )}
                </Match>
                <Match when={sessions.isSuccess}>
                    <SessionsTable
                        sessions={sessions.data ?? []}
                        busy={isLoading()}
                        onRevoke={(id) => void revoke(id)}
                    />
                </Match>
            </Switch>

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
