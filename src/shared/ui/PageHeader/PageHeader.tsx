import { Show, type JSX } from 'solid-js';
import { A } from '@solidjs/router';
import { useI18n } from '@shared/i18n/i18n-context';
import Card from '@shared/ui/Card';
import {
    SkeletonText,
    useSkeleton,
    type SkeletonProps,
} from '@shared/ui/Skeleton';
import './page-header.scss';

type PageHeaderProps = {
    /** Where the page sits, above the title in small accent capitals. */
    eyebrow?: JSX.Element;
    title: JSX.Element;
    /** What the page is for: one short sentence. */
    description?: JSX.Element;
    /** The docs article that tells the rest (/docs/<slug>), linked as "Read more". */
    docs?: string;
    /** A line of small print under it (a date, a count). */
    meta?: JSX.Element;
    /** The page's main action, beside the title (under the text in `hero`). */
    actions?: JSX.Element;
    /**
     * A brand page's opening (About): the same parts on a card with the
     * brand pattern, larger, the actions under the text. Only where
     * `.patterned` is allowed.
     */
    hero?: boolean;
} & SkeletonProps;

const frameClass = (props: PageHeaderProps, loading = false) =>
    [
        'page-header',
        loading && 'page-header--loading',
        props.hero && 'page-header--hero',
    ]
        .filter(Boolean)
        .join(' ');

/**
 * The frame: a plain box, or for `hero` a patterned Card. The Card has no
 * loading form of its own (skeleton={false}): the header draws its own,
 * with a real h1.
 */
function Frame(props: {
    header: PageHeaderProps;
    loading?: boolean;
    children: JSX.Element;
}) {
    return (
        <Show
            when={props.header.hero}
            fallback={
                <div class={frameClass(props.header, props.loading)}>
                    {props.children}
                </div>
            }
        >
            <Card
                patterned
                skeleton={false}
                class={frameClass(props.header, props.loading)}
            >
                {props.children}
            </Card>
        </Show>
    );
}

/**
 * A page's opening: eyebrow, title and what the page is for, its main action
 * on the right. The same rhythm on every page.
 *
 * Its loading form (in a `SkeletonScope` that loads) keeps each text it has
 * and shows a bar in place of each one that is empty: the eyebrow, the h1
 * (which stays a real h1, for the outline and the focus) and two lines of
 * description. The meta line goes; the actions keep their room but do not
 * show. `hero` keeps its card and pattern while it loads.
 */
export default function PageHeader(props: PageHeaderProps) {
    const { t } = useI18n();
    const loading = useSkeleton(props);
    return (
        <Show when={!loading()} fallback={<Loading {...props} />}>
            <Frame header={props}>
                <div class="page-header-text">
                    <Show when={props.eyebrow}>
                        <p class="page-eyebrow">{props.eyebrow}</p>
                    </Show>
                    <h1>{props.title}</h1>
                    <Show when={props.description}>
                        <p class="page-description">
                            {props.description}
                            <Show when={props.docs}>
                                {(slug) => (
                                    <>
                                        {' '}
                                        <A
                                            class="page-more"
                                            href={`/docs/${slug()}`}
                                        >
                                            {t('ui.more', 'Read more')}
                                        </A>
                                    </>
                                )}
                            </Show>
                        </p>
                    </Show>
                    <Show when={props.meta}>
                        <p class="page-meta">{props.meta}</p>
                    </Show>
                </div>
                <Show when={props.actions}>
                    <div class="page-actions">{props.actions}</div>
                </Show>
            </Frame>
        </Show>
    );
}

/** The same frame, with bars where the texts are not there yet. */
function Loading(props: PageHeaderProps) {
    return (
        <Frame header={props} loading>
            <div class="page-header-text">
                <p class="page-eyebrow">
                    {props.eyebrow || <SkeletonText width="6em" />}
                </p>
                <h1>{props.title || <SkeletonText width="14em" />}</h1>
                <p class="page-description">
                    {props.description || <SkeletonText lines={2} />}
                </p>
            </div>
            <Show when={props.actions}>
                <div class="page-actions page-actions--loading">
                    {props.actions}
                </div>
            </Show>
        </Frame>
    );
}
