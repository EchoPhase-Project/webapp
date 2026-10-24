# Contributing to the EchoPhase webapp

Thank you for helping with the web client of EchoPhase. This guide covers how
the code is organised and the rules it follows; the
[organisation's guide](https://github.com/EchoPhase-Project/.github/blob/main/CONTRIBUTING.md)
covers what is common to every repository (issues, licence, security reports).

## Setting up

Tools are pinned with [mise](https://mise.jdx.dev) (Node, oras):

```sh
mise install --locked
mise run install          # npm ci
mise run dev              # http://localhost:5173
```

The dev server proxies `/api/` (the realtime gateway socket included) to a
server at `API_TARGET`, by default `http://localhost:8080`; run one from
[server](https://github.com/EchoPhase-Project/server) or point `API_TARGET` at
another instance. Only `/api/` with the slash is proxied: `/api-clients` is a
page. The dev server has no `/config.json`, so visit statistics and error
reports stay off while you work. Pages for trying out components are under
`/dev/*` (`src/dev/`); a build leaves them out.

Before opening a pull request:

```sh
mise run check            # contract types, tsc, ESLint, Prettier, tests, build
```

CI runs the same, plus a Docker build of the image.

## How the code is organised

| Folder                 | What                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/app/`             | entry (`main.tsx`), `Root` (head), `Layout`, routes and providers (`Router.tsx`), navigation, footer  |
| `src/features/<name>/` | one feature each: its page, components, API calls, styles and tests                                   |
| `src/shared/`          | what features share: `api/`, `i18n/`, `ui/`, `nav/`, `theme/`, `lib/`, `styles/`, `meta/`, `testing/` |
| `src/dev/`             | pages for trying out shared components (dev server only)                                              |
| `src/static/`          | fonts, icons and translations (`locales/`)                                                            |

Import through the aliases (`@app/…`, `@features/…`, `@shared/…`, `@dev/…`,
`@static/…`), never `../`. ESLint enforces the boundaries:

- `shared` imports only `shared`;
- a feature imports `shared` and itself, never another feature: what two
  features need moves to `src/shared/`;
- `dev` pages try out shared code only;
- `app` may import anything (it puts the features together).

Inside a feature, `XPage.tsx` only puts the page together (title, header,
layout). Its parts go in `components/`, its API calls in `api.ts`, and logic
worth testing in plain modules with tests beside them (`sessions/user-agent.ts`
and `user-agent.test.ts`). A feature has one stylesheet, `<feature>.scss`.

## Code style

- TypeScript is strict. Prettier formats (4 spaces, 2 in SCSS and JSON, single
  quotes, 80 columns): `npm run format`.
- ESLint lints with types, and with the Solid rules. `solid/reactivity` is an
  error: read props as `props.x` inside JSX or effects, and split them with
  `splitProps` instead of destructuring.
- Components and pages are PascalCase files (`SessionsPage.tsx`); modules,
  hooks and providers kebab-case (`user-agent.ts`, `auth-provider.tsx`).
- Comments are full sentences that say why or what for, not what the next line
  does. Exported functions and components get a `/** … */` comment.
- A page sets its title and description with `useRootMeta()` in a
  `createRenderEffect`, and opens with `PageHeader`.

## UI

Build pages from `src/shared/ui` before writing new markup:

| Component                                             | For                                                                                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                              | actions: `primary` (the main one), `ghost`, `icon` (delete, revoke), `danger` (the confirmed destructive action), `danger-outline` (leads to one) |
| `Field`, `FieldError`, `ErrorSummary`                 | form fields with their label and errors, wired for screen readers                                                                                 |
| `Modal`, `ConfirmDialog`                              | dialogs (native `<dialog>`); ask before anything that cannot be undone                                                                            |
| `Card`, `EmptyState`, `Table`, `PageHeader`, `Switch` | surfaces, lists, the page's opening, on/off settings                                                                                              |

### Styles

- Colours come only from the tokens in `src/shared/styles/tokens.scss`, defined
  for the light and the dark theme. `palette.test.ts` checks their contrast
  (WCAG): text 7:1; muted text, links and status colours 4.5:1; accents and
  focus 3:1. A new token needs both themes and must pass it.
- Every stylesheet is global (no CSS modules): prefix class names with the
  component or feature (`.sessions-…`, `.consent-…`) and never style bare
  elements (`p`, `h1`, `header`) outside `global.scss`.
- Every SCSS file gets the `vars`, `comp` (`@include comp.media(…)`) and
  `prefixes` modules without importing them (`vite.config.ts`).
- The flowing-lines pattern (`.patterned`, `Card patterned`) is for brand
  moments only: the sign-in card, empty states, the outage screen, About. Not
  on tables, menus or forms.

### Accessibility

- Everything interactive works with the keyboard and shows its focus.
- Fields have labels (`Field` does it), and errors are tied to their field.
- Colour is never the only signal of a state, an error or a link.
- Native elements (`button`, `a`, `dialog`) before custom ones; ARIA only where
  HTML has nothing.
- Animations have a `@media (prefers-reduced-motion: reduce)` block.
- Check what you changed in both themes, and at a phone's width.

## Talking to the API

All calls go through the typed client in `src/shared/api/client.ts`
(openapi-fetch) and `send()`, which returns `{ ok, data }` or `{ ok, errors }`
instead of throwing. Types come from the server's contract: never write a
response type by hand in `types.ts`.

- `api-version` names the contract version the webapp is built against.
  `mise run contract:pull` downloads it, `mise run gen:api` regenerates
  `src/shared/api/schema.d.ts`, and CI fails when that file is out of date.
- To build against a newer server: bump `api-version`, run `mise run gen:api`,
  fix what the compiler finds, and commit both.
- Errors are shown under their field (`groupErrors`), the rest at the top of
  the form. Their text is translated by code: `errors.<code>` in the locale
  files, with the server's message as the fallback.
- Pages that need a session are wrapped in `requireAuth` in `Router.tsx`; parts
  of a page use `SignedIn` / `SignedOut`.

## Translations

Every string the user sees comes from `src/static/locales/`:
`<lang>.json` for the whole site, `<page>.<lang>.json` for one page
(`useLocalizer('<page>')`). English is the source; the other languages are
translated in Weblate.

- Add new strings to the English files only, with the English text as the
  fallback in the code: `t('key', 'English text')`. A missing translation shows
  in English until it is translated.
- Do not remove or rename a key without doing the same in every language:
  `locales.test.ts` fails on keys English no longer has.
- The policy pages (`terms`, `privacy`) use a small markup so translators edit
  plain text: a blank line between paragraphs, `- ` lines for a list,
  `[text](/path)` for a link.

## Privacy

Nothing that collects data about visitors runs without their consent. The
optional services (Umami statistics, GlitchTip error reports) start and stop in
`src/shared/lib/optional-services.ts`, by the categories of
`src/shared/lib/consent.ts`. A new one gets a category there, a switch in the
cookie settings (`features/consent/`), a mention in the privacy policy, and a
higher `ConsentVersion`, so everyone is asked again.

## A new page

1. A feature folder with its page, and a route in `src/app/Router.tsx`
   (wrapped in `requireAuth` if it needs a session).
2. A link in the navigation (`src/app/nav-links.ts`) or the footer.
3. Its strings in a `<page>.en.json` namespace.
4. If search engines should find it, an `Allow:` line in `public/robots.txt`:
   the file is an allowlist, a page is private until listed.

## Tests

Vitest, with tests beside the code (`*.test.ts`, `*.test.tsx`). Tests run in
Node; a component test starts with `// @vitest-environment jsdom`.
`src/shared/testing` has what page tests need: `fakeApi()` answers API calls
and records them, `renderPage()` renders a page with its providers.

```sh
mise run test             # extra arguments go to Vitest
mise run test:coverage    # artifacts/coverage
```

## Commits and pull requests

Commit messages follow Conventional Commits (`feat:`, `fix:`, `refactor:`,
`feat!:` for breaking changes), checked in CI; release notes are made from
them. Keep a pull request to one change, and add screenshots of changed
screens, in both themes.

Releases are tags `vX.Y.Z` made by the maintainers: the image is published to
`ghcr.io/echophase-project/webapp` with a GitHub release.
