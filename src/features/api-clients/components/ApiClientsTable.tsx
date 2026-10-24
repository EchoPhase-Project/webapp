import { AiOutlineClose } from 'solid-icons/ai';
import type { ApiClient } from '@shared/api/types';
import { useAuth } from '@shared/api/auth-provider';
import { DateHelper } from '@shared/lib/date-helper';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import { Table, Cell, Row } from '@shared/ui/Table';

const COLUMNS = ['name', 'expires', 'last_used', 'created', 'actions'] as const;
const COLUMN_TEXT: Record<(typeof COLUMNS)[number], string> = {
    name: 'Name',
    expires: 'Expires',
    last_used: 'Last used',
    created: 'Created',
    actions: 'Actions',
};

export default function ApiClientsTable(props: {
    clients: ApiClient[];
    busy: boolean;
    onDelete: (id: string) => void;
}) {
    const { user } = useAuth();
    const i18n = useI18n();
    const t = useLocalizer('api-clients');

    const column = (c: (typeof COLUMNS)[number]) =>
        t(`columns.${c}`, COLUMN_TEXT[c]);
    // Times in the profile's zone, so they read the same on any device.
    const show = (iso: string | null) =>
        DateHelper.format(iso, user()?.timeZone, i18n.currentLocale()) || '—';

    return (
        <Table
            data={props.clients}
            headers={COLUMNS.map(column)}
            placeholder={() => <>{t('empty', 'No API clients')}</>}
            tableProps={{ class: 'api-clients' }}
            render={({ item: client }) => (
                <Row>
                    <Cell label={column('name')} text={client.Name} />
                    <Cell
                        label={column('expires')}
                        text={show(client.ExpiresAt)}
                    />
                    <Cell
                        label={column('last_used')}
                        text={show(client.LastUsedAt)}
                    />
                    <Cell
                        label={column('created')}
                        text={show(client.CreatedAt)}
                    />
                    <Cell
                        label={column('actions')}
                        props={{ class: 'actions' }}
                    >
                        <Button
                            variant="icon"
                            aria-label={t('delete', 'Delete {name}').replace(
                                '{name}',
                                client.Name
                            )}
                            disabled={props.busy}
                            onClick={() => props.onDelete(client.Id)}
                        >
                            <AiOutlineClose />
                        </Button>
                    </Cell>
                </Row>
            )}
        />
    );
}
