# Contributing to the EchoPhase webapp

Thank you for your help with the web client of EchoPhase. This guide tells how
the code is organised and which rules it obeys. The rules for all repositories
(issues, licence, security reports) are in the
[guide of the organisation](https://github.com/EchoPhase-Project/.github/blob/main/CONTRIBUTING.md).

## Preparation

The project pins the tools (Node, oras) with [mise](https://mise.jdx.dev):

```sh
mise install --locked
mise run install          # npm ci
mise run dev              # http://localhost:5173
```

The dev server sends `/api/` to a server at `API_TARGET`. This includes the
socket of the realtime gateway. The default value is `http://localhost:8080`.
Run a server from [server](https://github.com/EchoPhase-Project/server), or
set `API_TARGET` to a different instance.

The dev server sends only `/api/` with the slash: `/api-clients` is a page.
The dev server does not have `/config.json`. Thus, visit statistics and error
reports stay off while you work.

Pages to try components are at `/dev/*` (`src/dev/`). A build does not include
them.

Before you open a pull request, run:

```sh
mise run check            # contract types, tsc, ESLint, Prettier, tests, build
```

CI runs the same checks. CI also builds the Docker image.

## How the code is organised

| Folder                 | Contents                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/`             | Entry (`main.tsx`), `Root` (head), `Layout`, the page registry (`pages.ts`), routes and providers (`Router.tsx`), navigation, footer |
| `src/features/<name>/` | One feature in each folder: its page, components, API calls, styles, and tests                                                       |
| `src/shared/`          | The code that features share: `api/`, `i18n/`, `ui/`, `nav/`, `theme/`, `lib/`, `styles/`, `meta/`, `testing/`                       |
| `src/dev/`             | Pages to try shared components (dev server only)                                                                                     |
| `src/static/`          | Fonts, icons, and translations (`locales/`)                                                                                          |

Import through the aliases (`@app/…`, `@features/…`, `@shared/…`, `@dev/…`,
`@static/…`). Do not use `../`. ESLint enforces these limits:

- `shared` imports only `shared`.
- A feature imports `shared` and its own files. It does not import a
  different feature. If two features need the same code, move that code to
  `src/shared/`.
- `dev` pages try only shared code.
- `app` can import all code, because it connects the features.

In a feature, `XPage.tsx` only assembles the page: title, header, layout. Put
the parts of the page in `components/` and the API calls in `api.ts`. Put
logic that must have tests in plain modules, with the tests adjacent to them
(`sessions/user-agent.ts` and `user-agent.test.ts`). A feature has one
stylesheet, `<feature>.scss`.

## Code style

- TypeScript is strict. Prettier formats the code: 4 spaces (2 in SCSS and
  JSON), single quotes, 80 columns. Run `npm run format`.
- ESLint uses type information and the Solid rules. `solid/reactivity` causes
  an error. Read props as `props.x` in JSX or in effects. Use `splitProps`.
  Do not destructure props.
- Components and pages are files in PascalCase (`SessionsPage.tsx`). Modules,
  hooks, and providers are files in kebab-case (`user-agent.ts`,
  `auth-provider.tsx`).
- Comments are full sentences. They tell why or for which purpose. They do
  not tell what the next line does. Exported functions and components have a
  `/** … */` comment.
- A page sets its title and description with `useRootMeta()` in a
  `createRenderEffect`. A page starts with `PageHeader`.

## UI

Before you write new markup, make pages from the components in
`src/shared/ui`:

| Component                                             | Purpose                                                                                                                                                   |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                              | Actions: `primary` (the main action), `ghost`, `icon` (delete, revoke), `danger` (the confirmed destructive action), `danger-outline` (opens that action) |
| `Field`, `FieldError`, `ErrorSummary`                 | Form fields with their labels and errors, connected for screen readers                                                                                    |
| `Modal`, `ConfirmDialog`                              | Dialogs (native `<dialog>`). Ask the user before an action that you cannot undo                                                                           |
| `Card`, `EmptyState`, `Table`, `PageHeader`, `Switch` | Surfaces, lists, the start of a page, on/off settings                                                                                                     |

### Styles

- Use only the colour tokens in `src/shared/styles/tokens.scss`. Each token
  has a value for the light theme and for the dark theme.
- `palette.test.ts` examines the contrast of the tokens (WCAG): text 7:1;
  muted text, links, and status colours 4.5:1; accents and focus 3:1. A new
  token must have values for the two themes and must pass this test.
- All stylesheets are global. The project does not use CSS modules. Start each
  class name with the name of the component or the feature (`.sessions-…`,
  `.consent-…`).
- Do not apply styles to bare elements (`p`, `h1`, `header`) outside
  `global.scss`.
- Each SCSS file gets the modules `vars`, `comp` (`@include comp.media(…)`),
  and `prefixes` automatically (`vite.config.ts`). Do not import them.
- Use the flowing-lines pattern (`.patterned`, `Card patterned`) only for
  brand areas: the sign-in card, empty states, the outage screen, the About
  page. Do not use it on tables, menus, or forms.

### Accessibility

- All interactive elements must operate with the keyboard and show their
  focus.
- Fields have labels (`Field` adds them). Each error is connected to its
  field.
- Do not use colour as the only signal of a state, an error, or a link.
- Use native elements (`button`, `a`, `dialog`) before custom elements. Use
  ARIA only where HTML does not have a solution.
- Animations have a `@media (prefers-reduced-motion: reduce)` block.
- Examine your changes in the two themes and at the width of a phone.

## The API

All calls go through the typed client in `src/shared/api/client.ts`
(openapi-fetch) and `send()`. `send()` returns `{ ok, data }` or
`{ ok, errors }`. It does not throw exceptions. The types come from the server
contract. Do not write a response type manually in `types.ts`.

- `api-version` contains the version of the contract that the webapp uses.
  `mise run contract:pull` downloads the contract. `mise run gen:api` makes
  `src/shared/api/schema.d.ts` again. CI fails if that file is not current.
- To use a newer server, do these steps:
    1. Increase `api-version`.
    2. Run `mise run gen:api`.
    3. Repair the errors that the compiler finds.
    4. Commit `api-version` and `schema.d.ts` together.
- The page shows each error below its field (`groupErrors`). It shows the
  other errors at the top of the form. The text of an error comes from its
  code: `errors.<code>` in the locale files. The message from the server is
  the fallback.
- A page that needs a session has `auth: true` in `src/app/pages.ts`.
  `Router.tsx` then adds `requireAuth`. Parts of a page use `SignedIn` and
  `SignedOut`.

## Translations

Each string that the user sees comes from `src/static/locales/`.
`<lang>.json` contains the strings for all of the site. `<page>.<lang>.json`
contains the strings for one page (`useLocalizer('<page>')`). English is the
source language. Translators write the other languages in Weblate.

- Add new strings only to the English files. In the code, give the English
  text as the fallback: `t('key', 'English text')`. A missing translation
  shows in English until a translator adds it.
- If you remove a key or change its name, do the same in all languages.
  `locales.test.ts` fails if a language has keys that English does not have.
- The policy pages (`terms`, `privacy`) use a small markup, so that
  translators edit plain text:
    - A blank line between paragraphs.
    - Lines that start with `- ` for a list.
    - `[text](/path)` for a link.

## Privacy

Code that collects data about visitors must not run without their consent.
The optional services (Umami statistics, GlitchTip error reports) start and
stop in `src/shared/lib/optional-services.ts`. They use the categories in
`src/shared/lib/consent.ts`. A new optional service must have:

- A category in `consent.ts`.
- A switch in the cookie settings (`features/consent/`).
- A paragraph in the privacy policy.
- A higher `ConsentVersion`, so that the site asks all users again.

## A new page

All pages are in the registry `PAGES` in `src/app/pages.ts`. `Router.tsx`
makes the routes from it, and `nav-links.ts` makes the sidebar from it. Do not
add routes or sidebar links directly.

1. Make a feature folder with the page.
2. Add an entry to `PAGES`:
    - `path` and `component`, with `lazy(() => import('@features/<name>/XPage'))`.
    - `auth: true` if the page needs a session.
    - `nav` if the page shows in the sidebar: an icon, an i18n key with its
      English text, and a `group` if the page is in a sub-menu.
    - `public: true` if search engines must find the page.
3. If the page is not in the sidebar, add a link to it in the footer
   (`src/app/Footer.tsx`) or on another page.
4. Put the strings of the page in a `<page>.en.json` namespace.
5. For a public page, add an `Allow:` line in `public/robots.txt`. The file is
   an allowlist: a page is private until it is in the list. `pages.test.ts`
   fails if `robots.txt` and the `public` pages are different.

## Tests

The tests use Vitest. They are adjacent to the code (`*.test.ts`,
`*.test.tsx`). Tests run in Node. A component test starts with
`// @vitest-environment jsdom`. `src/shared/testing` contains the tools for
page tests: `fakeApi()` answers API calls and records them. `renderPage()`
renders a page with its providers.

```sh
mise run test             # Vitest gets the extra arguments
mise run test:coverage    # artifacts/coverage
```

## Commits and pull requests

Commit messages follow Conventional Commits (`feat:`, `fix:`, `refactor:`,
`feat!:` for incompatible changes). CI examines them. The release notes come
from them.

Make only one change in each pull request. Add screenshots of the changed
screens in the two themes.

The maintainers make the releases with tags `vX.Y.Z`. A tag publishes the
image to `ghcr.io/echophase-project/webapp` and makes a GitHub release.
