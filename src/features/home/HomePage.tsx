import { createRenderEffect } from 'solid-js';
import { useRootMeta } from '@shared/meta/page-meta';
import { useLocalizer } from '@shared/i18n/i18n-context';
import PageHeader from '@shared/ui/PageHeader';

export default function HomePage() {
    const { setTitle, setDescription } = useRootMeta();
    const page = useLocalizer('home');

    createRenderEffect(() => {
        setTitle(`${page('title', 'Home')} · EchoPhase`);
        setDescription(
            page(
                'description',
                'Secure API bridge and real-time communication platform for modern distributed applications.'
            )
        );
    });

    return (
        <PageHeader
            eyebrow="EchoPhase"
            title={page('heading', 'Home page')}
            description={page(
                'description',
                'Secure API bridge and real-time communication platform for modern distributed applications.'
            )}
        />
    );
}
