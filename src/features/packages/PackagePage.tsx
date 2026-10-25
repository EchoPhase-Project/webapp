import { useParams } from '@solidjs/router';
import PackageDetails from './components/PackageDetails';
import './packages.scss';

/** /explore/:id: one workflow package. */
export default function PackagePage() {
    const params = useParams<{ id: string }>();
    return <PackageDetails id={params.id} />;
}
