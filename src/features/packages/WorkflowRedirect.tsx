import { createEffect } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { useQueryClient } from '@tanstack/solid-query';
import { workflowQuery } from './api/workflows';
import { packagePath } from './package-nav';

/**
 * /workflows and /workflows/:id, addresses from before packages: to the
 * workflow in its package, or to the packages.
 */
export default function WorkflowRedirect() {
    const params = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    createEffect(() => {
        const id = params.id;
        if (!id) {
            navigate('/packages', { replace: true });
            return;
        }
        void queryClient.fetchQuery(workflowQuery(id)).then(
            (w) =>
                navigate(
                    `${packagePath(w.packageId)}/${encodeURIComponent(id)}`,
                    { replace: true }
                ),
            () => navigate('/packages', { replace: true })
        );
    });

    return null;
}
