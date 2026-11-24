# Docs articles

This file tells how to add or change a help article of the `/docs` page,
and how to link it from a page.

[Back to CONTRIBUTING.md](../../CONTRIBUTING.md)

The `/docs/:slug?` page (`src/features/docs/`) shows
the articles. Each article is a Markdown file. The page loads a file only
when the user opens it.

## Procedure

1. Choose a slug. Use lowercase letters, digits, and `-` only. The file
   name must agree with the pattern in `docs.ts`.
2. Write `src/static/docs/<slug>.en.md`. English is the source.
3. Start the file with one `# Title` line. The docs list and the page title
   come from this heading.
4. Write short paragraphs and lists. Use `**bold**` for the names of
   controls.
5. Write each paragraph on one line. The renderer (`breaks: true`) shows
   each line break.
6. Write links in the app as `[text](/docs/other-slug)` or `[text](/page)`.
   A link to a different site opens in a new tab.
7. Do not write other language files. Translators add
   `<slug>.ro.md` and `<slug>.ru.md`. If a language does not have the
   article, the page shows English.
8. Add the slug to `ARTICLES` in `src/features/docs/docs.ts`. The order of
   this list is the order of the docs list.
9. Link the article from the page header of each related page:
   `<PageHeader … docs="<slug>" />`. `PageHeader` shows "Read more" after
   the description.
10. In a `SettingsCard`, link the article in the `hint`:
    `<A class="page-more" href="/docs/<slug>">{t('ui.more', 'Read more')}</A>`.

## Change or remove an article

- If you change the English text, do not edit the other languages.
  Translators update them.
- If you remove an article or change its slug, do it in all language files.
  Also change `ARTICLES` and each `docs="<slug>"` and `/docs/<slug>` link.
  Find them with `grep -rn '<slug>' src`.

## Rules

- `public/robots.txt` already allows `/docs/`. Do not add a line for each
  article.
- The UI text of the docs page is in `src/static/locales/docs.en.json`. The
  article text is not in the locale files.

## Tests

`src/features/docs/DocsPage.test.tsx` loads each slug in `ARTICLES` in
English. It fails if an article has no `# Title`. If you add a link from a
page, you can make sure in the page test that the "Read more" link has
`href="/docs/<slug>"`.

## Check

Run `mise run check`. Then open `/docs/<slug>` in the dev server and read
the article. If you cannot do this, tell the user.

## Examples

- `src/static/docs/packages.en.md`, `src/static/docs/sessions.en.md`.
- `src/features/docs/docs.ts`: `ARTICLES`, `loadArticle`, `titleOf`.
- `src/features/packages/PackagesPage.tsx`: `docs="packages"`.
- `src/features/packages/components/PackageSettings.tsx`: a "Read more"
  link in a hint.
