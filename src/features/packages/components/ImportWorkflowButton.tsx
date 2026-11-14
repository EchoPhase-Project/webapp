import { useNavigate } from '@solidjs/router';
import { createSubmit } from '@shared/api/submit';
import type { ErrorItem } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import FilePicker from '@shared/ui/FilePicker';
import { importWorkflowMutation } from '@features/packages/api/workflows';
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
    const { busy, mutation } = createSubmit();
    const importing = mutation(importWorkflowMutation);

    function upload(file: File) {
        return importing.run(
            { file, packageId: props.packageId },
            ({ workflow: w, intact }) => {
                props.onErrors([]);
                navigate(
                    `${packagePath(w.packageId)}/${w.id}${intact ? '' : '?edited=1'}`
                );
            },
            // The page shows them, next to its other errors.
            (errors) => {
                props.onErrors(errors);
                return {};
            }
        );
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
