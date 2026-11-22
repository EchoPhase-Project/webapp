import { IconUpload } from '@shared/ui/icons';
import { usePageMeta } from '@shared/meta/page-meta';
import { createSubmit } from '@shared/api/submit';
import type { StoredFile } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { createPagedList } from '@shared/api/paged-list';
import ConfirmDialog, { createConfirm } from '@shared/ui/ConfirmDialog';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import FilePicker from '@shared/ui/FilePicker';
import Paginated from '@shared/ui/Paginated';
import PageHeader from '@shared/ui/PageHeader';
import {
    deleteFileMutation,
    filesInfiniteQuery,
    uploadFileMutation,
} from './api';
import FilesTable from './components/FilesTable';
import './files.scss';

/** The signed-in user's files: upload, download, delete. */
export default function FilesPage() {
    const t = useLocalizer('files');

    usePageMeta(() => ({
        title: t('title', 'Files'),
        description: t(
            'description',
            'Files you uploaded, and those made for you.'
        ),
    }));

    const files = createPagedList(() => filesInfiniteQuery());
    const uploads = createSubmit();
    const uploading = uploads.mutation(uploadFileMutation);
    // A failed delete shows in its dialog, which stays open.
    const deletion = createConfirm(
        deleteFileMutation,
        (file: StoredFile) => file.id
    );

    function upload(file: File) {
        return uploading.run({ file });
    }

    return (
        <div class="page-stack">
            <PageHeader
                eyebrow={t('eyebrow', 'Storage')}
                title={t('title', 'Files')}
                description={t(
                    'description',
                    'Files you uploaded, and those made for you.'
                )}
                docs="files"
                actions={
                    <FilePicker
                        busy={uploads.busy()}
                        onPick={(f) => void upload(f)}
                    >
                        <IconUpload />
                        {t('ui.upload', 'Upload')}
                    </FilePicker>
                }
            />

            <ErrorSummary errors={uploads.errors()} />

            <Paginated list={files}>
                {(items) => (
                    <FilesTable
                        files={items()}
                        busy={uploads.busy() || deletion.busy()}
                        onDelete={deletion.ask}
                    />
                )}
            </Paginated>

            <ConfirmDialog
                {...deletion.dialog}
                title={t('confirm_delete.title', 'Delete this file?')}
                confirm={t('ui.delete', 'Delete')}
            >
                {(file) => (
                    <p>
                        {t(
                            'confirm_delete.text',
                            '{name} is deleted for good; links to it stop working.',
                            { name: file.name }
                        )}
                    </p>
                )}
            </ConfirmDialog>
        </div>
    );
}
