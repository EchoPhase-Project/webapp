import { createRenderEffect, createSignal, on, Show } from 'solid-js';
import { IconUpload } from '@shared/ui/icons';
import { usePageMeta } from '@shared/meta/page-meta';
import { useAuth } from '@shared/api/auth-provider';
import { createSubmit } from '@shared/api/submit';
import type { StoredFile } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { createPagedList } from '@shared/lib/paged-list';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import ErrorSummary from '@shared/ui/ErrorSummary';
import FilePicker from '@shared/ui/FilePicker';
import PageHeader from '@shared/ui/PageHeader';
import { deleteFile, listFiles, PAGE_SIZE, uploadFile } from './api';
import FilesTable from './components/FilesTable';
import './files.scss';

/** The signed-in user's files: upload, download, delete. */
export default function FilesPage() {
    const { isAuthenticated } = useAuth();
    const t = useLocalizer('files');

    usePageMeta(() => ({
        title: t('title', 'Files'),
        description: t(
            'description',
            'Files you uploaded, and those made for you.'
        ),
    }));

    const files = createPagedList(async (after) => {
        const page = await listFiles(after);
        // A full last page: there may be more after it, after its last file.
        return {
            items: page,
            next: page.length === PAGE_SIZE ? (page.at(-1)?.id ?? null) : null,
        };
    });
    const { busy, errors, pending, run } = createSubmit();
    // The file whose deletion waits for a yes.
    const [deleting, setDeleting] = createSignal<StoredFile | null>(null);

    createRenderEffect(
        on(isAuthenticated, (signedIn) => {
            if (signedIn) void files.reset({ keep: true });
        })
    );

    async function upload(file: File) {
        await run(
            () => uploadFile(file),
            (stored) => {
                // Oldest first: a new file is the last one, once all are shown.
                if (!files.more())
                    files.setItems((current) => [...current, stored]);
            }
        );
    }

    // A failed delete shows nothing: the dialog closes, the file stays.
    async function remove(file: StoredFile) {
        try {
            await pending(async () => {
                const result = await deleteFile(file.id);
                if (result.ok)
                    files.setItems((current) =>
                        current.filter((f) => f.id !== file.id)
                    );
            });
        } finally {
            setDeleting(null);
        }
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
                    <FilePicker busy={busy()} onPick={(f) => void upload(f)}>
                        <IconUpload />
                        {t('ui.upload', 'Upload')}
                    </FilePicker>
                }
            />

            <ErrorSummary errors={errors()} />

            <FilesTable
                files={files.items()}
                busy={busy()}
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
                busy={busy()}
                onConfirm={(file) => void remove(file)}
                onCancel={() => setDeleting(null)}
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
