import { AiOutlineClose } from 'solid-icons/ai';
import type { FilePurpose, StoredFile } from '@shared/api/types';
import { useAuth } from '@shared/api/auth-provider';
import { formatBytes } from '@shared/lib/bytes';
import { DateHelper } from '@shared/lib/date-helper';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import { Table, Cell, Row } from '@shared/ui/Table';
import { contentUrl } from '@features/files/api';

const COLUMNS = ['name', 'purpose', 'size', 'uploaded', 'actions'] as const;
const COLUMN_TEXT: Record<(typeof COLUMNS)[number], string> = {
    name: 'Name',
    purpose: 'Purpose',
    size: 'Size',
    uploaded: 'Uploaded',
    actions: 'Actions',
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
    const { user } = useAuth();
    const i18n = useI18n();
    const t = useLocalizer('files');

    const column = (c: (typeof COLUMNS)[number]) =>
        t(`columns.${c}`, COLUMN_TEXT[c]);
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
                        text={DateHelper.format(
                            file.createdAt,
                            user()?.timeZone,
                            i18n.currentLocale()
                        )}
                    />
                    <Cell
                        label={column('actions')}
                        props={{ class: 'actions' }}
                    >
                        <Button
                            variant="icon-danger"
                            aria-label={t('delete', 'Delete {name}').replace(
                                '{name}',
                                file.name
                            )}
                            disabled={props.busy}
                            onClick={() => props.onDelete(file)}
                        >
                            <AiOutlineClose />
                        </Button>
                    </Cell>
                </Row>
            )}
        />
    );
}
