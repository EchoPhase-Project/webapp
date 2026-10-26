import { createEffect } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { getWorkflow } from './api';
import { packagePath } from './package-nav';

/**
 * /workflows and /workflows/:id, addresses from before packages: to the
 * workflow in its package, or to the packages.
 */
export default function WorkflowRedirect() {
    const params = useParams<{ id?: string }>();
    const navigate = useNavigate();

    createEffect(() => {
        const id = params.id;
        if (!id) {
            navigate('/packages', { replace: true });
            return;
        }
        void getWorkflow(id).then((result) =>
            navigate(
                result.ok
                    ? `${packagePath(result.data.packageId)}/${encodeURIComponent(id)}`
                    : '/packages',
                { replace: true }
            )
        );
    });

    return null;
}
