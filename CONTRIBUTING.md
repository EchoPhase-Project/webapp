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
- To show an API time, use `useDateFormat()` from `@shared/lib/date-format`.
  It shows the time in the time zone of the user and in the current language.
  Do not call `DateHelper.format` in a component.
- A page sets its title and description with `usePageMeta()` from
  `@shared/meta/page-meta`: `usePageMeta(() => ({ title, description }))`.
  Do not add " · EchoPhase" to the title. `usePageMeta` adds it.
- A page starts with `PageHeader`.
- Put the content of a page in an element with the `page-stack` class
  (`global.scss`). If a page needs more styles, add a feature class next to
  it. Do not write the same grid again in a feature stylesheet.
- Use the helpers in `src/shared/lib` before you write the same logic again:
    - `createDebounced(ms)`: a search that waits for a pause in typing.
    - `createDismiss(ref, isOpen, close)`: a popup that closes on a click
      outside and on Escape.
    - `createClipboard()`: a copy button with a "Copied" state
      (`ui.copied`).

## UI

Before you write new markup, make pages from the components in
`src/shared/ui`:

| Component                                             | Purpose                                                                                                                                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                              | Actions: `primary` (the main action), `ghost`, `icon` (delete, revoke), `danger` (the confirmed destructive action), `danger-outline` (opens that action), `link` (an action in a sentence) |
| `HeaderButton`                                        | The square icon buttons in the top bar (new note, notifications, theme)                                                                                                                     |
| `Tabs`, `NavTabs`                                     | A line of tabs over one panel (Write and Preview), with the keyboard of the WAI-ARIA tabs pattern. `NavTabs` are links to the parts of a page                                               |
| `Field`, `Select`, `FieldError`, `ErrorSummary`       | Form fields with their labels and errors, connected for screen readers                                                                                                                      |
| `Checkbox`, `RadioGroup`                              | Options in a form, as cards. The form sends them                                                                                                                                            |
| `TimeZoneField`                                       | A field for an IANA time zone, with the zones of the browser as suggestions                                                                                                                 |
| `TextArea`, `MarkdownEditor`                          | Text of more than one line, with its label and errors. `MarkdownEditor` adds the Write and Preview tabs                                                                                     |
| `Modal`, `ConfirmDialog`                              | Dialogs (native `<dialog>`). Ask the user before an action that you cannot undo                                                                                                             |
| `Card`, `EmptyState`, `Table`, `PageHeader`, `Switch` | Surfaces, lists, the start of a page, on/off settings that the app saves immediately                                                                                                        |
| `SettingsCard`                                        | One part of a settings page: a title, a description, the content, and a footer with a hint and the action                                                                                   |
| `ShareList`                                           | The people that an item is shared with, and a username field to share it. The feature gives its API functions                                                                               |
| `BackLink`                                            | The link back to the list or the package, above the `PageHeader` and above a "not found" message                                                                                            |
| `RemoveButton`                                        | The cross at the end of a row that removes the row (a file, a person, a tag). Its label tells what goes                                                                                     |
| `LoadError`                                           | The error of a read that failed, in place of the data, and a button to try again                                                                                                            |

### Controls

- Make buttons, tabs, checkboxes, radio buttons, selects, and text areas with
  the components in `src/shared/ui`. Do not write `<button>`, `<select>`,
  `<textarea>`, or `<input type="checkbox">` in a feature. These components
  have one look and one keyboard behaviour.
- ESLint (`no-restricted-syntax`) stops these elements outside
  `src/shared/ui` and `src/shared/nav`.
- If a full card or a full row opens an item, you can use `<button>`. Then
  write `eslint-disable-next-line no-restricted-syntax` with the reason on the
  line above it. A card is not an action button, and the `.btn` style does
  not apply to it.
- Use `Switch` for a setting that the app saves immediately. Use `Checkbox`
  for an option that a form sends. The two controls have different
  behaviour.
- If an action goes to a different page, use a link (`<A>`). Do not use
  `Button variant="link"` for it.
- If a `ConfirmDialog` asks about one item, give the item to `item`. The
  dialog is open while `item` has a value. It gives the item to `onConfirm`
  and to the children function. Thus, the page does not need `open` or a `!`
  assertion.
- If the action of a `ConfirmDialog` can fail, give the errors to `errors`.
  Close the dialog only in `onOk`. Thus, the user sees why the action failed
  and can try again.

### Icons

- Import each icon from `@shared/ui/icons`. Do not import an icon library
  directly. ESLint stops a direct import.
- Only `src/shared/ui/icons.ts` imports the icon libraries. This file is the
  list of all icons in the app.
- Each export has the name of the icon in the Tabler catalogue
  (tabler.io/icons), for example `IconX` or `IconTrash`. Thus, a new icon
  has a known name.
- Use one icon for one meaning. Before you add an export, find an export with
  the same meaning in `icons.ts`.
- Take each icon from Tabler (`@tabler/icons-solidjs`). If Tabler does not
  have the icon, use `solid-icons`: first `fi` (Feather), then `si` for brand
  logos. Feather has the style that is nearest to Tabler.
- If you export an icon from `solid-icons`, write a comment in `icons.ts`. The
  comment tells which Tabler icons you examined.
- The icon size is the font size of the text around the icon. The line width
  is in `global.scss` (`.tabler-icon`). Do not set `size` or `stroke` in JSX.

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
  `prefixes`, and `mix` automatically (`vite.config.ts`). Do not import them.
- `mix` (`src/shared/styles/mixins.scss`) contains the rules that many
  components use. Before you copy a rule, examine this file.
  `@include mix.input-frame` gives the border, the focus ring, and the
  invalid ring of a field.
  `@include mix.plain-list(6px)` removes the bullets and the indent of a
  list, and puts its items in a column.
- `global.scss` contains classes that many pages use. `actions-row` is a
  row of buttons, and `actions-row--end` moves it to the right. `badge` is
  a small label, for example a version. `pill pill--ok` (or `--bad`,
  `--busy`, `--quiet`) is a status word. Do not make a copy of these
  classes in a feature.
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
- If a list call can fail, return `dataOr(result, [])` from
  `@shared/api/client`. Do not write `result.ok ? result.data : []`.
- To send a file, make the body with `multipart({ File: file })`. The
  contract types a multipart body as an object of strings. Thus, `multipart`
  keeps the only cast in one location.
- If a list comes one page at a time, use `createPagedList(describe)` from
  `@shared/lib/paged-list`. `describe` gives the `…InfiniteQuery` description
  from the `api.ts` file of the feature, with `cursorPages`. The helper adds
  the pages to the list. A new search is a new key, and Query cancels the
  request for the old key. The ref `watchEnd` gets the next page when the end
  of the list comes into view. Thus, a page does not keep a cursor or a
  stale-answer guard of its own.
- If a new item comes at the top of such a list, use `refreshHead`. If one
  item changes or goes away, use `patchItem` or `removeItem`. Do not
  invalidate the list for these changes. An invalidation fetches all the
  loaded pages again, one after the other.
- To save a form, use `createSubmit(fields)` from `@shared/api/submit`.
  `run(call, onOk)` sets `busy`, sends the call, and groups the errors. If
  the call is successful, `run` clears the errors and gives the data to
  `onOk`. The save code is then the same in all forms.
- If one error needs a special display, give `run` an `onFail` function. If
  `onFail` returns a value, the form shows that value. Refer to the "unchanged"
  conflict in `PublishModal.tsx`. This keeps the special case adjacent to the
  call.
- Each action shows its errors. Do not ignore a failed result. If the user
  does not see the failure, the user thinks that the action was successful.
- If an action has a `ConfirmDialog`, give the errors to its `errors` prop.
  The dialog then stays open and shows the errors. On cancel, clear the
  errors. If the action has no dialog, put an `ErrorSummary` adjacent to the
  action or above the list. Refer to `VersionList.tsx` and `SessionsPage.tsx`.
- `pending(work)` only sets `busy`. If you use it, show the errors with
  `setErrors`.
- If each row of a list saves on its own, use `runFor(key, call, onOk)` with
  the ID of the row as the key. `busy(key)` and `errors(key)` then apply only
  to that row. `busy()` is true if a save is in progress. Thus, one row that
  saves or fails does not stop the other rows. Refer to
  `PackageWorkflowList.tsx`.
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
- If a string contains a value, write a `{name}` placeholder. Give the value
  to `t()`: `t('key', 'Delete {name}', { name })`. Do not use `.replace()` on
  the result. The translator puts the value in each placeholder.
- Words that many pages show (Delete, Save, Name, Loading…) are in the
  `ui.*` keys of `<lang>.json`. Use these keys from all pages:
  `t('ui.delete', 'Delete')`. Do not add a copy of a `ui.*` word to a page
  file. A page translator (`useLocalizer('<page>')`) also finds the
  site-wide keys. If a language needs a different word in one location, use
  a page key there.
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
