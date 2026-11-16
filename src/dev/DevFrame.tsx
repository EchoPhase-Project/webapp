import { Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { usePageMeta } from '@shared/meta/page-meta';
import BackLink from '@shared/ui/BackLink';
import PageHeader from '@shared/ui/PageHeader';
import type { DevPage } from './routes';
import './dev.scss';

/** A playground page with its header (from routes.ts) and the way back. */
export default function DevFrame(props: {
    page: DevPage;
    /** All pages, for the index. */
    pages: readonly DevPage[];
    /** The index's path; none on the index itself. */
    back?: string;
}) {
    usePageMeta(() => ({
        title: props.page.title,
        description: props.page.description,
    }));

    return (
        <div class="page-stack dev-page">
            <Show when={props.back}>
                {(href) => (
                    <BackLink href={href()} label="All playground pages" />
                )}
            </Show>
            <PageHeader
                eyebrow="Dev playground"
                title={props.page.title}
                description={props.page.description}
            />
            <Dynamic component={props.page.component} pages={props.pages} />
        </div>
    );
}
