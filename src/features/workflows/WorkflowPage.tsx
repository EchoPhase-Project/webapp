import { useParams } from '@solidjs/router';
import WorkflowDetails from './components/WorkflowDetails';
import './workflows.scss';

/** /workflows/:id: one workflow. */
export default function WorkflowPage() {
    const params = useParams<{ id: string }>();
    return <WorkflowDetails id={params.id} />;
}
