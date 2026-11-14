import { createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useQueryClient } from '@tanstack/solid-query';
import type { ErrorItem } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import FilePicker from '@shared/ui/FilePicker';
import { packageKeys } from '@features/packages/api/packages';
import { importWorkflow } from '@features/packages/api/workflows';
import { packagePath } from '@features/packages/package-nav';

/**
 * Imports an export file as a workflow, into the package given or a new
 * one of its own, and opens it; what went wrong goes to `onErrors`.
 */
export default function ImportWorkflowButton(props: {
    packageId?: string;
    onErrors: (errors: ErrorItem[]) => void;
}) {
    const t = useLocalizer('workflows');
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [busy, setBusy] = createSignal(false);

    async function upload(file: File) {
        setBusy(true);
        try {
            const result = await importWorkflow(file, props.packageId);
            if (!result.ok) {
                props.onErrors(result.errors);
                return;
            }
            props.onErrors([]);
            const w = result.data.workflow;
            // Its package has one more workflow (or is new): asked again.
            void queryClient.invalidateQueries({
                queryKey: packageKeys.workflows(w.packageId),
            });
            void queryClient.invalidateQueries({
                queryKey: packageKeys.mine(),
            });
            navigate(
                `${packagePath(w.packageId)}/${w.id}${result.data.intact ? '' : '?edited=1'}`
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <FilePicker
            accept="application/json,.json"
            variant="ghost"
            busy={busy()}
            onPick={(f) => void upload(f)}
        >
            {t('import', 'Import a workflow')}
        </FilePicker>
    );
}
