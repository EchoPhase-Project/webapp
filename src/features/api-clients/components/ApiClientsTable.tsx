import type { ApiClient } from '@shared/api/types';
import { useDateFormat } from '@shared/lib/date-format';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { Table, Cell, Row } from '@shared/ui/Table';
import RemoveButton from '@shared/ui/RemoveButton';

const COLUMNS = ['name', 'expires', 'last_used', 'created', 'actions'] as const;
// Each column's key and English text; the shared words are site-wide.
const COLUMN_TEXT: Record<(typeof COLUMNS)[number], [string, string]> = {
    name: ['ui.name', 'Name'],
    expires: ['columns.expires', 'Expires'],
    last_used: ['columns.last_used', 'Last used'],
    created: ['columns.created', 'Created'],
    actions: ['ui.actions', 'Actions'],
};

export default function ApiClientsTable(props: {
    clients: ApiClient[];
    busy: boolean;
    onDelete: (client: ApiClient) => void;
}) {
    const date = useDateFormat();
    const t = useLocalizer('api-clients');

    const column = (c: (typeof COLUMNS)[number]) => t(...COLUMN_TEXT[c]);
    // Times in the profile's zone, so they read the same on any device.
    const show = (iso: string | null) => date(iso) || '—';

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
                        <RemoveButton
                            label={t('ui.delete_named', 'Delete {name}', {
                                name: client.Name,
                            })}
                            disabled={props.busy}
                            onClick={() => props.onDelete(client)}
                        />
                    </Cell>
                </Row>
            )}
        />
    );
}
