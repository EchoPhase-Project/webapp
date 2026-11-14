import type { FilePurpose, StoredFile } from '@shared/api/types';
import { formatBytes } from '@shared/lib/bytes';
import { useDateFormat } from '@shared/lib/date-format';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import { Table, Cell, Row } from '@shared/ui/Table';
import RemoveButton from '@shared/ui/RemoveButton';
import { contentUrl } from '@features/files/api';

const COLUMNS = ['name', 'purpose', 'size', 'uploaded', 'actions'] as const;
// Each column's key and English text; the shared words are site-wide.
const COLUMN_TEXT: Record<(typeof COLUMNS)[number], [string, string]> = {
    name: ['columns.name', 'Name'],
    purpose: ['columns.purpose', 'Purpose'],
    size: ['columns.size', 'Size'],
    uploaded: ['columns.uploaded', 'Uploaded'],
    actions: ['ui.actions', 'Actions'],
};

const PURPOSE_TEXT: Record<FilePurpose, string> = {
    Avatar: 'Profile picture',
    Import: 'Import',
    Artifact: 'Workflow result',
    Attachment: 'Attachment',
};

export default function FilesTable(props: {
    files: StoredFile[];
    busy: boolean;
    onDelete: (file: StoredFile) => void;
}) {
    const date = useDateFormat();
    const i18n = useI18n();
    const t = useLocalizer('files');

    const column = (c: (typeof COLUMNS)[number]) => t(...COLUMN_TEXT[c]);
    const purpose = (p: FilePurpose) =>
        t(`purposes.${p}`, PURPOSE_TEXT[p] ?? p);

    return (
        <Table
            data={props.files}
            headers={COLUMNS.map(column)}
            placeholder={() => <>{t('empty', 'No files yet')}</>}
            tableProps={{ class: 'files' }}
            render={({ item: file }) => (
                <Row>
                    <Cell label={column('name')} props={{ title: file.name }}>
                        <a href={contentUrl(file.id)} download={file.name}>
                            {file.name}
                        </a>
                    </Cell>
                    <Cell
                        label={column('purpose')}
                        text={purpose(file.purpose)}
                    />
                    <Cell
                        label={column('size')}
                        text={formatBytes(file.size, i18n.currentLocale())}
                    />
                    <Cell
                        label={column('uploaded')}
                        text={date(file.createdAt)}
                    />
                    <Cell
                        label={column('actions')}
                        props={{ class: 'actions' }}
                    >
                        <RemoveButton
                            label={t('ui.delete_named', 'Delete {name}', {
                                name: file.name,
                            })}
                            disabled={props.busy}
                            onClick={() => props.onDelete(file)}
                        />
                    </Cell>
                </Row>
            )}
        />
    );
}
