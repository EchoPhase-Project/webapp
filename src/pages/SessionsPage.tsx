import { createRenderEffect } from 'solid-js';
import { useRootMeta } from '@lib/root';
import { Component } from 'solid-js';
import { Table, Cell, Row } from '@components/Table';
import { useSession } from '@lib/api';
import type { Session } from '@lib/api';
import { AiOutlineClose } from 'solid-icons/ai';
import { useLocalizer } from '@lib/i18n';

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

export default function SessionsPage() {
    const { setTitle, setDescription } = useRootMeta();
    const { sessions, revokeSession, revokeAllSessions, isLoading } =
        useSession();
    const t = useLocalizer('sessions');

    createRenderEffect(() => {
        setTitle(`${t('title', 'Sessions')} · EchoPhase`);
        setDescription(t('description', 'List of current active sessions.'));
    });

    const data = (): Session[] => sessions()?.data ?? [];

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
                    onClick={revokeAllSessions}
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
                                    onClick={() => revokeSession(session.id)}
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
