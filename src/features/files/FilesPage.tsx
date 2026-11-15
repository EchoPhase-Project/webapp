import { createSignal, Show } from 'solid-js';
import { IconUpload } from '@shared/ui/icons';
import { usePageMeta } from '@shared/meta/page-meta';
import { createSubmit } from '@shared/api/submit';
import type { StoredFile } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { createPagedList } from '@shared/api/paged-list';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import FilePicker from '@shared/ui/FilePicker';
import LoadError from '@shared/ui/LoadError';
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
    const removal = createSubmit();
    const deletion = removal.mutation(deleteFileMutation);
    // The file whose deletion waits for a yes.
    const [deleting, setDeleting] = createSignal<StoredFile | null>(null);

    function upload(file: File) {
        return uploading.run({ file });
    }

    function remove(file: StoredFile) {
        return deletion.run(file.id, () => setDeleting(null));
    }

    function cancelDelete() {
        setDeleting(null);
        removal.setErrors({});
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

            <Show when={files.error()}>
                {(error) => (
                    <LoadError
                        error={error()}
                        busy={files.retrying()}
                        onRetry={files.retry}
                    />
                )}
            </Show>

            <FilesTable
                files={files.items()}
                busy={uploads.busy() || removal.busy()}
                onDelete={setDeleting}
            />

            <Show when={files.more()}>
                <div class="files-more">
                    <Button
                        variant="ghost"
                        busy={files.loading()}
                        onClick={() => files.loadMore()}
                    >
                        {t('ui.show_more', 'Show more')}
                    </Button>
                </div>
            </Show>

            <ConfirmDialog
                item={deleting()}
                title={t('confirm_delete.title', 'Delete this file?')}
                confirm={t('ui.delete', 'Delete')}
                busy={removal.busy()}
                errors={removal.errors()}
                onConfirm={(file) => void remove(file)}
                onCancel={cancelDelete}
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
