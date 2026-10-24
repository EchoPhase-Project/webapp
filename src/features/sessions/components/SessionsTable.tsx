import { AiOutlineClose } from 'solid-icons/ai';
import type { Session } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import { Table, Cell, Row } from '@shared/ui/Table';
import { parseUserAgent } from '@features/sessions/user-agent';

export default function SessionsTable(props: {
    sessions: Session[];
    busy: boolean;
    onRevoke: (id: string) => void;
}) {
    const t = useLocalizer('sessions');

    const device = (deviceId: string) => {
        const parsed = parseUserAgent(deviceId);
        if (!parsed) return deviceId;
        return t('device.browser_on_os', '{browser} on {os}')
            .replace(
                '{browser}',
                parsed.browser ?? t('device.unknown_browser', 'Unknown browser')
            )
            .replace('{os}', parsed.os ?? t('device.unknown_os', 'Unknown OS'));
    };

    return (
        <Table
            data={props.sessions}
            headers={[
                t('columns.device', 'Device'),
                t('columns.actions', 'Actions'),
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
                        label={t('columns.actions', 'Actions')}
                        props={{ class: 'actions' }}
                    >
                        <Button
                            variant="icon"
                            disabled={props.busy}
                            aria-label={t('revoke', 'Revoke session')}
                            onClick={() => props.onRevoke(session.id)}
                        >
                            <AiOutlineClose />
                        </Button>
                    </Cell>
                </Row>
            )}
        />
    );
}
