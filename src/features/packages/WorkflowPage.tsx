import { useParams } from '@solidjs/router';
import WorkflowDetails from './components/WorkflowDetails';
import './workflows.scss';

/** /packages/:packageId/workflows/:id: one workflow of a package. */
export default function WorkflowPage() {
    const params = useParams<{ packageId: string; id: string }>();
    return <WorkflowDetails id={params.id} packageId={params.packageId} />;
}
