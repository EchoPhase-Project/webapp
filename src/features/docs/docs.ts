// Articles: src/static/docs/<slug>.<code>.md, English the source of each,
// loaded only when opened. A language without the article shows English.

const files = import.meta.glob<string>('@static/docs/*.md', {
    query: '?raw',
    import: 'default',
});

const loaders: Record<string, () => Promise<string>> = {};
for (const [path, loader] of Object.entries(files)) {
    const match = path.match(/\/([a-z0-9-]+)\.([a-z]{2})\.md$/);
    if (match) loaders[`${match[1]}.${match[2]}`] = loader;
}

/** The articles in the order the docs list them. */
export const ARTICLES = [
    'packages',
    'workflows',
    'explore',
    'notes',
    'files',
    'sessions',
] as const;

export type Article = (typeof ARTICLES)[number];

export const isArticle = (slug: string | undefined): slug is Article =>
    ARTICLES.includes(slug as Article);

/** An article's Markdown in this language, or English; null when there is none. */
export async function loadArticle(
    slug: string,
    locale: string
): Promise<string | null> {
    const loader = loaders[`${slug}.${locale}`] ?? loaders[`${slug}.en`];
    return loader ? loader() : null;
}

/** An article's title: its first heading. */
export const titleOf = (markdown: string) =>
    markdown.match(/^#\s+(.+)$/m)?.[1].trim() ?? '';
