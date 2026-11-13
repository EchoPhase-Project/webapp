import { createRenderEffect, createSignal, on, Show } from 'solid-js';
import { IconUpload } from '@shared/ui/icons';
import { usePageMeta } from '@shared/meta/page-meta';
import { useAuth } from '@shared/api/auth-provider';
import { createSubmit } from '@shared/api/submit';
import type { StoredFile } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
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

    const [files, setFiles] = createSignal<StoredFile[]>([]);
    // A full last page: there may be more after it.
    const [more, setMore] = createSignal(false);
    const [loading, setLoading] = createSignal(false);
    const { busy, errors, pending, run } = createSubmit();
    // The file whose deletion waits for a yes.
    const [deleting, setDeleting] = createSignal<StoredFile | null>(null);

    async function load(after?: string) {
        setLoading(true);
        try {
            const page = await listFiles(after);
            setFiles((current) => (after ? [...current, ...page] : page));
            setMore(page.length === PAGE_SIZE);
        } finally {
            setLoading(false);
        }
    }

    createRenderEffect(
        on(isAuthenticated, (signedIn) => {
            if (signedIn) void load();
        })
    );

    async function upload(file: File) {
        await run(
            () => uploadFile(file),
            (stored) => {
                // Oldest first: a new file is the last one, once all are shown.
                if (!more()) setFiles((current) => [...current, stored]);
            }
        );
    }

    // A failed delete shows nothing: the dialog closes, the file stays.
    async function remove(file: StoredFile) {
        try {
            await pending(async () => {
                const result = await deleteFile(file.id);
                if (result.ok)
                    setFiles((current) =>
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

            <FilesTable files={files()} busy={busy()} onDelete={setDeleting} />

            <Show when={more()}>
                <div class="files-more">
                    <Button
                        variant="ghost"
                        busy={loading()}
                        onClick={() => void load(files().at(-1)?.id)}
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
