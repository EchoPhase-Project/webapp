import { useParams } from '@solidjs/router';
import WorkflowDetails from './components/WorkflowDetails';
import './workflows.scss';

/** /packages/:packageId/workflows/:id/:tab: one workflow of a package, one of its parts. */
export default function WorkflowPage() {
    const params = useParams<{ packageId: string; id: string; tab?: string }>();
    return (
        <WorkflowDetails
            id={params.id}
            packageId={params.packageId}
            tab={params.tab}
        />
    );
}
