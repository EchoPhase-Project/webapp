import type { Session } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { Table, Cell, Row } from '@shared/ui/Table';
import { parseUserAgent } from '@shared/lib/user-agent';
import RemoveButton from '@shared/ui/RemoveButton';

export default function SessionsTable(props: {
    sessions: Session[];
    busy: boolean;
    onRevoke: (id: string) => void;
}) {
    const t = useLocalizer('sessions');

    const device = (deviceId: string) => {
        const parsed = parseUserAgent(deviceId);
        if (!parsed) return deviceId;
        return t('device.browser_on_os', '{browser} on {os}', {
            browser:
                parsed.browser ??
                t('device.unknown_browser', 'Unknown browser'),
            os: parsed.os ?? t('device.unknown_os', 'Unknown OS'),
        });
    };

    return (
        <Table
            data={props.sessions}
            headers={[
                t('columns.device', 'Device'),
                t('ui.actions', 'Actions'),
            ]}
            placeholder={() => <>{t('empty', 'No active sessions')}</>}
            tableProps={{ class: 'sessions' }}
            render={({ item: session }) => (
                <Row>
                    <Cell
                        label={t('columns.device', 'Device')}
                        text={device(session.deviceId ?? '')}
                        props={{ class: 'device' }}
                    />
                    <Cell
                        label={t('ui.actions', 'Actions')}
                        props={{ class: 'actions' }}
                    >
                        <RemoveButton
                            label={t('revoke', 'Revoke session')}
                            disabled={props.busy}
                            onClick={() => props.onRevoke(session.id)}
                        />
                    </Cell>
                </Row>
            )}
        />
    );
}
