import { createRenderEffect, createResource, createSignal } from 'solid-js';
import { useRootMeta } from '@shared/meta/page-meta';
import { Component } from 'solid-js';
import { Table, Cell, Row } from '@shared/ui/Table';
import { api, send } from '@shared/api/client';
import { useAuth } from '@shared/api/auth-provider';
import type { Session } from '@shared/api/types';
import { AiOutlineClose } from 'solid-icons/ai';
import { useLocalizer } from '@shared/i18n/i18n-context';

const NoSessionsPlaceholder: Component = () => {
    const t = useLocalizer('sessions');
    return <>{t('empty', 'No active sessions')}</>;
};

const parseUserAgent = (
    deviceId: string,
    t: (key: string, fallback: string) => string
): string => {
    if (!deviceId.startsWith('Mozilla')) return deviceId;
    const match = deviceId.match(/\(([^)]+)\)/);
    const browserMatch = deviceId.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/);
    const os =
        match?.[1]?.split(';')[0] ?? t('device.unknown_os', 'Unknown OS');
    const browser =
        browserMatch?.[1] ?? t('device.unknown_browser', 'Unknown Browser');
    return t('device.browser_on_os', '{browser} on {os}')
        .replace('{browser}', browser)
        .replace('{os}', os);
};

/** The signed-in user's sessions, fetched by this page only. */
export default function SessionsPage() {
    const { setTitle, setDescription } = useRootMeta();
    const { isAuthenticated } = useAuth();
    const [busy, setBusy] = createSignal(false);

    const [sessions, { refetch }] = createResource(
        isAuthenticated,
        async (): Promise<Session[]> => {
            const result = await send(api.GET('/api/v1/sessions'));
            return result.ok ? result.data.data : [];
        }
    );

    const revoking = async (call: () => Promise<unknown>) => {
        setBusy(true);
        try {
            await call();
            await refetch();
        } finally {
            setBusy(false);
        }
    };

    const revokeSession = (id: string) =>
        revoking(() =>
            send(
                api.DELETE('/api/v1/sessions/{id}', {
                    params: { path: { id } },
                })
            )
        );

    const revokeAllSessions = () =>
        revoking(() => send(api.DELETE('/api/v1/sessions')));

    const isLoading = () => busy() || sessions.loading;
    const t = useLocalizer('sessions');

    createRenderEffect(() => {
        setTitle(`${t('title', 'Sessions')} · EchoPhase`);
        setDescription(t('description', 'List of current active sessions.'));
    });

    const data = (): Session[] => sessions() ?? [];

    const headers = () => [
        t('columns.device', 'Device'),
        t('columns.actions', 'Actions'),
    ];

    return (
        <div class="sessions-container">
            <div class="sessions-header">
                <h1>{t('heading', 'Active Sessions')}</h1>
                <button
                    class="btn"
                    disabled={isLoading() || data().length === 0}
                    onClick={() => void revokeAllSessions()}
                >
                    {t('revoke_all', 'Revoke All')}
                </button>
            </div>
            <Table
                data={data()}
                headers={headers()}
                placeholder={NoSessionsPlaceholder}
                tableProps={{ class: 'sessions' }}
                render={({ item: session }) => (
                    <Row>
                        <Cell
                            label={t('columns.device', 'Device')}
                            text={parseUserAgent(session.deviceId ?? '', t)}
                            props={{ class: 'device' }}
                        />
                        <Cell
                            label={t('columns.actions', 'Actions')}
                            props={{ class: 'actions' }}
                        >
                            <div>
                                <button
                                    class="btn"
                                    disabled={isLoading()}
                                    aria-label={t('revoke', 'Revoke session')}
                                    onClick={() =>
                                        void revokeSession(session.id)
                                    }
                                >
                                    <AiOutlineClose />
                                </button>
                            </div>
                        </Cell>
                    </Row>
                )}
            />
        </div>
    );
}
