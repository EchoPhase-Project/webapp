import { createRenderEffect, createResource, For, Show } from 'solid-js';
import { A, useNavigate, useParams } from '@solidjs/router';
import { useRootMeta } from '@shared/meta/page-meta';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import EmptyState from '@shared/ui/EmptyState';
import Markdown from '@shared/ui/Markdown';
import PageHeader from '@shared/ui/PageHeader';
import { ARTICLES, isArticle, loadArticle, titleOf } from './docs';
import './docs.scss';

/**
 * /docs and /docs/:slug: how EchoPhase works, an article at a time, the
 * list beside it. Public: no session needed.
 */
export default function DocsPage() {
    const params = useParams<{ slug?: string }>();
    const i18n = useI18n();
    const t = useLocalizer('docs');
    const { setTitle, setDescription } = useRootMeta();
    const navigate = useNavigate();

    // Links between articles (plain <a> in the Markdown) stay in the app.
    const follow = (e: MouseEvent) => {
        const link = (e.target as Element).closest('a');
        const href = link?.getAttribute('href');
        if (
            !href?.startsWith('/') ||
            e.button !== 0 ||
            e.metaKey ||
            e.ctrlKey ||
            e.shiftKey ||
            e.altKey
        )
            return;
        e.preventDefault();
        navigate(href);
    };

    // Every article's title, for the list (the files are small).
    const [titles] = createResource(
        () => i18n.currentLocale(),
        async (locale) =>
            Object.fromEntries(
                await Promise.all(
                    ARTICLES.map(async (slug) => [
                        slug,
                        titleOf((await loadArticle(slug, locale)) ?? '') ||
                            slug,
                    ])
                )
            ) as Record<string, string>
    );
    const [article] = createResource(
        () =>
            params.slug
                ? ([params.slug, i18n.currentLocale()] as const)
                : false,
        ([slug, locale]) => (isArticle(slug) ? loadArticle(slug, locale) : null)
    );

    createRenderEffect(() => {
        const text = article();
        setTitle(
            `${(text && titleOf(text)) || t('title', 'Documentation')} · EchoPhase`
        );
        setDescription(t('description', 'How EchoPhase works.'));
    });

    return (
        <div class="docs-page">
            <nav class="docs-nav" aria-label={t('title', 'Documentation')}>
                <A href="/docs" end class="docs-nav-link">
                    {t('title', 'Documentation')}
                </A>
                <ul>
                    <For each={ARTICLES}>
                        {(slug) => (
                            <li>
                                <A href={`/docs/${slug}`} class="docs-nav-link">
                                    {titles()?.[slug] ?? slug}
                                </A>
                            </li>
                        )}
                    </For>
                </ul>
            </nav>
            <main class="docs-main">
                <Show
                    when={params.slug}
                    fallback={
                        <>
                            <PageHeader
                                title={t('title', 'Documentation')}
                                description={t(
                                    'lead',
                                    'How EchoPhase works: packages, workflows and the rest.'
                                )}
                            />
                            <ul class="docs-index">
                                <For each={ARTICLES}>
                                    {(slug) => (
                                        <li class="card">
                                            <A href={`/docs/${slug}`}>
                                                {titles()?.[slug] ?? slug}
                                            </A>
                                        </li>
                                    )}
                                </For>
                            </ul>
                        </>
                    }
                >
                    <Show
                        when={article()}
                        fallback={
                            <Show when={!article.loading}>
                                <EmptyState>
                                    {t('not_found', 'No such article.')}
                                </EmptyState>
                            </Show>
                        }
                    >
                        {(text) => (
                            <div onClick={follow}>
                                <Markdown text={text()} class="docs-article" />
                            </div>
                        )}
                    </Show>
                </Show>
            </main>
        </div>
    );
}
