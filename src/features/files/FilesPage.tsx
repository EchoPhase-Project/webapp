import { createRenderEffect, createSignal, on, Show } from 'solid-js';
import { AiOutlineUpload } from 'solid-icons/ai';
import { useRootMeta } from '@shared/meta/page-meta';
import { useAuth } from '@shared/api/auth-provider';
import { groupErrors, type FormErrors } from '@shared/api/errors';
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
    const { setTitle, setDescription } = useRootMeta();
    const { isAuthenticated } = useAuth();
    const t = useLocalizer('files');

    createRenderEffect(() => {
        setTitle(`${t('title', 'Files')} · EchoPhase`);
        setDescription(
            t('description', 'Files you uploaded, and those made for you.')
        );
    });

    const [files, setFiles] = createSignal<StoredFile[]>([]);
    // A full last page: there may be more after it.
    const [more, setMore] = createSignal(false);
    const [loading, setLoading] = createSignal(false);
    const [busy, setBusy] = createSignal(false);
    const [errors, setErrors] = createSignal<FormErrors>({});
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
        setBusy(true);
        try {
            const result = await uploadFile(file);
            if (!result.ok) {
                setErrors(groupErrors(result.errors, []));
                return;
            }
            setErrors({});
            // Oldest first: a new file is the last one, once all are shown.
            if (!more()) setFiles((current) => [...current, result.data]);
        } finally {
            setBusy(false);
        }
    }

    async function remove(file: StoredFile) {
        setBusy(true);
        try {
            const result = await deleteFile(file.id);
            if (result.ok)
                setFiles((current) => current.filter((f) => f.id !== file.id));
        } finally {
            setBusy(false);
            setDeleting(null);
        }
    }

    return (
        <div class="files-container">
            <PageHeader
                eyebrow={t('eyebrow', 'Storage')}
                title={t('title', 'Files')}
                description={t(
                    'lead',
                    'Files you uploaded, and those made for you.'
                )}
                more={t(
                    'lead_more',
                    'Up to 100 MB each; pictures open in the browser, everything else downloads.'
                )}
                actions={
                    <FilePicker busy={busy()} onPick={(f) => void upload(f)}>
                        <AiOutlineUpload />
                        {t('upload', 'Upload')}
                    </FilePicker>
                }
            />

            <ErrorSummary errors={errors()} inputId={() => ''} />

            <FilesTable files={files()} busy={busy()} onDelete={setDeleting} />

            <Show when={more()}>
                <div class="files-more">
                    <Button
                        variant="ghost"
                        busy={loading()}
                        onClick={() => void load(files().at(-1)?.id)}
                    >
                        {t('more', 'Show more')}
                    </Button>
                </div>
            </Show>

            <ConfirmDialog
                open={!!deleting()}
                title={t('confirm_delete.title', 'Delete this file?')}
                confirm={t('confirm_delete.action', 'Delete')}
                busy={busy()}
                onConfirm={() => void remove(deleting()!)}
                onCancel={() => setDeleting(null)}
            >
                <p>
                    {t(
                        'confirm_delete.text',
                        '{name} is deleted for good; links to it stop working.'
                    ).replace('{name}', deleting()?.name ?? '')}
                </p>
            </ConfirmDialog>
        </div>
    );
}
