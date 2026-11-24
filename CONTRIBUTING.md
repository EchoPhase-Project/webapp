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

Pages to try components are at `/dev/*` (`src/dev/`). The page `/dev` shows a
list of all these pages. A usual build does not include them. A build with
`VITE_DEV_TOOLS=true` includes them and the TanStack Query devtools. The dev
cluster uses this build if you deploy it with `dev:deploy --dev-tools` (refer
to [deploy](https://github.com/EchoPhase-Project/deploy)).

Before you open a pull request, run:

```sh
mise run check            # contract types, tsc, ESLint, Prettier, tests, build
```

CI runs the same checks. CI also builds the Docker image.

`mise run check` runs its steps in parallel. Each output line starts with the
name of its step, for example `[check:lint]`. If one step fails, the check
fails. To run one step, run its task, for example `mise run check:types`.

tsc, Prettier, and ESLint keep caches in `node_modules/.cache`. Thus, a second
run is faster. The ESLint cache is for local runs only: if `CI` is set,
ESLint runs without the cache. The cache does not know which types a file gets
from other files, so a typed rule can pass on an old result.

In CI, `COVERAGE=1` makes `check:test` write the coverage report. Thus, CI
runs the tests only one time.

## How the code is organised

| Folder                 | Contents                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`             | Entry (`main.tsx`), `Root` (head), `Layout`, the page registry (`pages.ts`), routes and providers (`Router.tsx`), navigation; the header, footer, and brand tile in folders |
| `src/features/<name>/` | One feature in each folder: its page, components, API calls, styles, and tests                                                                                              |
| `src/shared/`          | The code that features share: `api/`, `consent/`, `i18n/`, `ui/`, `nav/`, `theme/`, `lib/`, `styles/`, `meta/`, `testing/`                                                  |
| `src/dev/`             | Pages to try shared components (dev server and `VITE_DEV_TOOLS` builds only)                                                                                                |
| `src/static/`          | Fonts, icons, and translations (`locales/`)                                                                                                                                 |

Import through the aliases (`@app/…`, `@features/…`, `@shared/…`, `@dev/…`,
`@static/…`). Do not use `../`. ESLint enforces these limits:

- `shared` imports only `shared`.
- A feature imports `shared` and its own files. It does not import a
  different feature. If two features need the same code, move that code to
  `src/shared/`.
- `dev` pages try only shared code.
- `app` can import all code, because it connects the features.

Put a shared helper in `src/shared/lib/` only if the helper has no domain.
If a helper belongs to a domain, put it in the folder of that domain. For
example, `paged-list.ts` is in `api/`, the consent code is in `consent/`, and
the avatar gradient is in `ui/Avatar/`. Thus, the code of a domain stays in
one folder, and `lib/` does not collect unrelated code.

In a feature, `XPage.tsx` only assembles the page: title, header, layout. Put
the parts of the page in `components/` and the API calls in `api.ts` (or
`api/<entity>.ts`, refer to [The API](#the-api)). Put
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
  `session-provider.tsx`).
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
      outside and on Escape. Use it only for a panel that `Popover` does not
      close, for example the list of `Combobox`.
    - `createClipboard()`: a copy button with a "Copied" state
      (`ui.copied`).
    - `matchOptions(options, query, fields)` (`text-match.ts`): the options
      that agree with a typed text, also if the text has small errors.
- Put a developer aid (a page, a panel, or details for a developer) behind
  `import.meta.env.DEV_TOOLS`. Do not read `import.meta.env.DEV` directly.
  `DEV_TOOLS` is true in the dev server and in a build with
  `VITE_DEV_TOOLS=true`, for example the dev cluster. Thus, one switch
  controls all aids in a build. `vite.config.ts` replaces `DEV_TOOLS` with
  `true` or `false` in each module. Thus, Rollup removes the aids and their
  chunks from the usual build. Do not copy `DEV_TOOLS` to an exported
  constant, because then Rollup keeps the chunks. ESLint enforces the rule,
  and `mise run check` examines `dist/` for the aids.

## UI

Before you write new markup, make pages from the components in
`src/shared/ui`:

| Component                                             | Purpose                                                                                                                                                                                       |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LinkButton`                                          | A link with the look of a `Button` (the same `variant`): a move to a page, a download, another site. It has no `disabled` and no `busy`                                                       |
| `Button`                                              | Actions: `primary` (the main action), `ghost`, `icon` (delete, revoke), `danger` (the confirmed destructive action), `danger-outline` (opens that action), `link` (an action in a sentence)   |
| `HeaderButton`                                        | The square icon buttons in the top bar (new note, notifications, theme)                                                                                                                       |
| `Tabs`, `NavTabs`                                     | A line of tabs over one panel (Write and Preview), with the keyboard of the WAI-ARIA tabs pattern. `NavTabs` are links to the parts of a page                                                 |
| `Field`, `Select`, `FieldError`, `ErrorSummary`       | Form fields with their labels and errors, connected for screen readers                                                                                                                        |
| `Checkbox`, `RadioGroup`                              | Options in a form, as cards. The form sends them                                                                                                                                              |
| `Listbox`                                             | A list of options that is always visible, for one choice or more than one, with the keyboard of the WAI-ARIA listbox pattern                                                                  |
| `Combobox`                                            | A button that opens a list of options for one short choice (the language), with the keyboard of the WAI-ARIA select-only combobox pattern. With `editable`, an input that filters a long list |
| `TimeZoneField`                                       | A field for an IANA time zone: an editable `Combobox` with the zones of the browser. It accepts only a zone from the list                                                                     |
| `TextArea`, `MarkdownEditor`                          | Text of more than one line, with its label and errors. `MarkdownEditor` adds the Write and Preview tabs                                                                                       |
| `Modal`, `ConfirmDialog`                              | Dialogs (native `<dialog>`). Ask the user before an action that you cannot undo                                                                                                               |
| `Popover`                                             | A panel that is not modal, next to its trigger: a menu, a list, the notifications. It shows in the top layer of the browser. A click outside and Escape close it                              |
| `Card`, `EmptyState`, `Table`, `PageHeader`, `Switch` | Surfaces, lists, the start of a page, on/off settings that the app saves immediately                                                                                                          |
| `Masonry`                                             | Cards of different heights in columns, in the order of the list (the Explore cards)                                                                                                           |
| `SettingsCard`                                        | One part of a settings page: a title, a description, the content, and a footer with a hint and the action                                                                                     |
| `ShareList`                                           | The people that an item is shared with, and a username field to share it. The feature gives its API functions                                                                                 |
| `BackLink`                                            | The link back to the list or the package, above the `PageHeader` and above a "not found" message                                                                                              |
| `RemoveButton`                                        | The cross at the end of a row that removes the row (a file, a person, a tag). Its label tells what goes                                                                                       |
| `LoadError`                                           | The error of a read that failed, in place of the data, and a button to try again                                                                                                              |
| `QueryState`                                          | One read in its states: `LoadError` with a retry, the loading form (with a `placeholder`), the `empty` text, the `notFound` text, the data                                                    |
| `InlineList`                                          | Short parts on one line with a dot between them ("by Ann · 12 installs"). It omits empty parts. Screen readers hear a comma                                                                   |
| `Paginated`                                           | A list that comes one page at a time, with "Show more" (mode `more`) or "Previous" and "Next" (mode `pages`), its states, and the focus                                                       |
| `SkeletonScope`, `SkeletonText`, `SkeletonBlock`      | A part of a page whose data loads: the shared components in it show bars in the shape of their content. `SkeletonText` and `SkeletonBlock` are bars for markup of your own                    |
| `PageSkeleton`                                        | The rough shape of a page (`header`, `table`, `cards`, `list`, `settings`, `detail`, `document`). `lazyPage` shows it while the page code loads                                               |

Each shared component has a page in `src/dev/`. The page shows the variants
and the states of the component. If you add a shared component, show it on a
page in `src/dev/`. If you make a new page, add one entry for it to the list
in `src/dev/routes.ts`. Thus, a person can examine the component in the
browser without a real page that uses it. The list gives the path, the title,
and the line on the index. The test renders each page from the list.

### Folders of the components

- If a component has its own stylesheet, give it a folder with its name.
  For example, `src/shared/ui/Modal/` contains `Modal.tsx`, `modal.scss`,
  `Modal.test.tsx`, and `index.ts`. Thus, a component and its style and
  tests are in one location.
- This rule applies to the components in `src/shared/ui` and to the parts of
  the app in `src/app`. Thus, the header, the footer, and the brand tile are
  in `src/app/Header/`, `src/app/Footer/`, and `src/app/BrandTile/`.
- The skeleton files of the app stay flat in `src/app/`: `main.tsx`,
  `Root.tsx`, `Router.tsx`, `Layout.tsx`, `pages.ts`, `nav-links.ts`,
  `NotFound.tsx`, and their tests. They do not have their own stylesheets.
- `index.ts` exports the default export and the named exports of the
  component. Thus, the import is `@shared/ui/Modal`, not
  `@shared/ui/Modal/Modal`.
- If only one component uses a helper component, put the helper in the
  folder of that component. For example, `LanguageSelect.tsx` is in
  `src/app/Header/`. Thus, the folder holds all the parts of the component.
- If some components use one stylesheet, put them in a family folder with
  the stylesheet. The form controls and `forms.scss` are in
  `src/shared/ui/forms/`. Import them as `@shared/ui/forms/Field`.
- A family folder does not have `index.ts` or a folder for each component.
  Each component in it is a file with its test adjacent to it.
- `icons.ts` stays at the root of `src/shared/ui`.
- If only the app uses a component, put it in `src/app/`. Thus,
  `src/shared/ui` contains only components that features can use.

### Controls

- Make buttons, tabs, checkboxes, radio buttons, selects, and text areas with
  the components in `src/shared/ui`. Do not write `<button>`, `<select>`,
  `<textarea>`, or `<input type="checkbox">` in a feature. These components
  have one look and one keyboard behaviour.
- ESLint (`no-restricted-syntax`) stops these elements outside
  `src/shared/ui` and `src/shared/nav`.
- If a link must look like a button, use `LinkButton`. Do not put the `btn`
  class on `<A>` or `<a>`. ESLint stops this class on a link. Thus, the
  look and the hover of a button have one source, `buttonClass`.
- Use `Button` for an action on the page. Use `LinkButton` for a move to a
  page, a download, or another site. A screen reader then tells the user
  the correct type of control.
- `LinkButton` adds an arrow (↗) and `rel="noopener noreferrer"` to a link
  to another site. With `target="_blank"`, screen readers also hear "opens
  in a new tab". Thus, the user knows before the click that the link leaves
  the app.
- If a full card or a full row opens an item, you can use `<button>`. Then
  write `eslint-disable-next-line no-restricted-syntax` with the reason on the
  line above it. A card is not an action button, and the `.btn` style does
  not apply to it.
- Use `Switch` for a setting that the app saves immediately. Use `Checkbox`
  for an option that a form sends. The two controls have different
  behaviour.
- If an action goes to a different page, use a link (`<A>`). Do not use
  `Button variant="link"` for it.
- A `ConfirmDialog` asks about one item. The dialog is open while `item`
  has a value. It gives the item to `onConfirm` and to the children
  function. Thus, the page does not need `open` or a `!` assertion.
- If the dialog is about the page (delete this package, revoke all
  sessions), give the entity or a word such as `'all'` as the item. Then all
  dialogs use the same form.
- If the action of a `ConfirmDialog` can fail, use `createConfirm`. It
  closes the dialog only after a success, and the dialog shows the errors.
  Thus, the user sees why the action failed and can try again.

### Panels

- A non-modal panel (a menu, a list, a notifications panel) opens with
  `Popover`. A modal opens with `Modal`.
- The browser puts a `Popover` in its top layer and closes it on a click
  outside and on Escape. A `Modal` makes the rest of the page inert and
  keeps the focus in the dialog.
- The trigger of a `Popover` belongs to the caller. The trigger changes
  `open` and sets `aria-expanded` and `aria-controls`.
- Give `onClose` to each `Popover`, and set `open` to false in it. The
  browser can close the panel, and `onClose` keeps the state of the trigger
  correct.
- Do not write a second `open` change for a click on the trigger.
  `Popover` makes sure that a click on the trigger of an open panel closes
  it.
- If a control must have its own panel, use `createPopover` from
  `@shared/ui/Popover`. `Combobox` uses it in the `manual` mode, because
  its keys close its list.

### List controls

Select the control for a choice from a list with these rules:

| The choice                                  | The control                                     | Example                        |
| ------------------------------------------- | ----------------------------------------------- | ------------------------------ |
| A usual choice in a form                    | The native `Select` (`@shared/ui/forms/Select`) | The fields of a form           |
| A short choice with its own look, no typing | `Combobox`                                      | `LanguageSelect` in the header |
| A long list with a search                   | `Combobox` with `editable`                      | `TimeZoneField`                |
| A list that is always visible               | `Listbox` (`multiple` for more than one)        | The page `/dev/listbox`        |

- Use the native `Select` for a usual choice in a form. A phone shows its
  own picker for it, and the app does not have to make one.
- Use `Combobox` only if the choice needs its own look, as in the header.
  The native `Select` is easier to use on a phone.
- Use an editable `Combobox` for a list that is too long to scroll. The user
  types some letters, and the list shows only the options that agree.
- Give an editable `Combobox` the texts `resultsText`, `noResults`, and
  `moreResults` from `ui.*` keys. The component has no text of its own, and
  each list uses the same words. Refer to `forms/TimeZoneField.tsx`.
- Do not write a list control of your own. Use `createOptionList` from
  `@shared/ui/Listbox` for a new control. It has the keys, the type-ahead,
  and the option ids that `Listbox` and `Combobox` use. Thus, all lists
  have one keyboard behaviour.
- To find options that agree with a typed text, use `matchOptions` from
  `@shared/lib/text-match`. Do not give it empty fields. An empty field is
  near each query of one or two letters, and then each option agrees.
- If the user selects the selected value again, `Listbox` and `Combobox` do
  not call `onChange`. Thus, the caller does not have to compare the values.
- `Field` and `TextArea` give the input event to `onInput`, as a native
  input does. All other controls give the new value to `onChange`:
  `MarkdownEditor`, `Select`, `TimeZoneField`, `Checkbox`, `RadioGroup`,
  `Listbox`, `Combobox`, `Switch`. Thus, one prop name always gets one type
  of argument.
- Give each form control the errors of its field with the `errors` prop:
  `Field`, `TextArea`, `MarkdownEditor`, `Select`, `TimeZoneField`,
  `Checkbox`, `RadioGroup`, `Switch`, `Combobox`. The control shows the errors under it and sets
  `aria-invalid` and `aria-describedby`. Thus, a screen reader reads the
  error with the control.

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
- Each export goes through `decorative` in `icons.ts`. Thus, each icon has
  `aria-hidden="true"`, and a screen reader does not read it two times next
  to its text.
- Do not write `aria-hidden` on an icon. The icon has it already.
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
- The frame of the app is an L. The bar (`Header`) goes across the top and
  holds the logo, which is the link to Home. On desktop, the rail goes under
  the bar.
  On desktop, the bar stays at the top. The page starts at the right of the
  rail.
  The sizes of the frame are the tokens `--header-height` and
  `--nav-collapsed`. Use these tokens for an offset. Do not write the values.
  The offsets then stay correct if the frame changes.
- A page gets its maximum width from its type. Do not set `max-width` on a
  page. The `skeleton` option of `lazyPage` gives the type (`PAGE_WIDTHS`):
  `document` is `text`, `table`, `cards`, and `list` are `wide`, and the
  other forms are `default`. The tokens are `--page-text`, `--page-default`,
  and `--page-wide`. Thus, lists and grids use a large screen, and text
  stays easy to read.
- If a table has few columns, give `lazyPage` the `width: 'default'`
  option. Sessions and API clients use this option. A wide table with few
  columns only makes the cells longer.
- For the space at the sides of a page, use `--page-gutter`. This value
  increases with the window, from 16px to 64px.
- If an element on a page is sticky, set `top` below the bar:
  `calc(var(--header-height) + 16px)` on desktop. If you do not do this, the
  bar covers the element.
- The tab order is the skip link, the logo, the buttons of the bar, the
  rail, and then the page. Keep this order in `Layout.tsx`.
- Each SCSS file gets the modules `vars`, `comp` (`@include comp.media(…)`),
  `prefixes`, and `mix` automatically (`vite.config.ts`). Do not import them.
- `mix` (`src/shared/styles/mixins.scss`) contains the rules that many
  components use. Before you copy a rule, examine this file.
  `@include mix.input-frame` gives the border, the focus ring, and the
  invalid ring of a field.
  The focus ring of a field shows only if the keyboard moved the focus to
  it. `watchFocusModality` in `shared/lib/focus-modality.ts` sets
  `data-focus-by` on `<html>`. A text field matches `:focus-visible` after
  a click too. Thus, CSS alone cannot make this difference.
  `@include mix.plain-list(6px)` removes the bullets and the indent of a
  list, and puts its items in a column.
- `global.scss` contains classes that many pages use. `actions-row` is a
  row of buttons, and `actions-row--end` moves it to the right. `badge` is
  a small label, for example a version. `pill pill--ok` (or `--bad`,
  `--busy`, `--quiet`) is a status word. Do not make a copy of these
  classes in a feature.
- For short parts on one line with a dot between them, use `InlineList`.
  Do not write `' · '`. The component draws the dot at the centre of the
  line in all fonts, and screen readers hear a comma. A wrapped line does
  not start with a dot. Inside a translated string, keep the `·`
  character. Translators must not get markup.
- A brand page (About) starts with `<PageHeader hero>`. It has the same
  parts on a card with the pattern, larger, with the actions under the
  text. Do not write a hero of your own. Thus, the title, the skeleton, and
  the focus on the `h1` stay the same on all pages.
- Use the flowing-lines pattern (`.patterned`, `Card patterned`) only for
  brand areas: the sign-in card, empty states, the outage screen, the About
  page. Do not use it on tables, menus, or forms.

### a11y (accessibility)

- All interactive elements must operate with the keyboard and show their
  focus.
- Fields have labels (`Field` adds them). Each error is connected to its
  field.
- Do not use colour as the only signal of a state, an error, or a link.
- Use native elements (`button`, `a`, `dialog`) before custom elements. Use
  ARIA only where HTML does not have a solution.
- If a control shows only an icon, give the name to the control. Use
  `aria-label` on a `Button` with `variant="icon"`, and `label` on
  `HeaderButton` and `RemoveButton`. The icon is hidden, so a screen reader
  reads only the name of the control.
- Each dialog has a title, and the title is its accessible name. `Modal`
  connects its `title` with `aria-labelledby`. If you make a dialog without
  `Modal`, give it `aria-labelledby` or `aria-label`. Without a name, a
  screen reader cannot tell what the dialog is for.
- Put each temporary message (a notice, "Copied", "Saved") in a live region:
  `role="status"`, or `role="alert"` for an error. Keep the live region on
  the page, and change only its text. A screen reader does not read a live
  region that comes with its first message.
- Do not put a secret or a token in a live region. Announce a short
  message, and keep the value as normal text next to it. A screen reader
  reads a live region aloud at once, and persons near the user can hear the
  value.
- Animations have a `@media (prefers-reduced-motion: reduce)` block.
- Examine your changes in the two themes and at the width of a phone.

## The API

All API calls go through TanStack Query (`@tanstack/solid-query`): reads,
changes, sign-in, and sign-out. The cache then keeps one copy of each item,
and a change shows on all pages. The typed client in
`src/shared/api/client.ts` (openapi-fetch) gives `api` and `request()`.
`request()` returns the data or throws an `ApiError`. The types come from the
server contract. Do not write a response type manually in `types.ts`.

- `api-version` contains the version of the contract that the webapp uses.
  `mise run contract:pull` downloads the contract. `mise run gen:api` makes
  `src/shared/api/schema.d.ts` again. CI fails if that file is not current.
- To use a newer server, do these steps:
    1. Increase `api-version`.
    2. Run `mise run gen:api`.
    3. Repair the errors that the compiler finds.
    4. Commit `api-version` and `schema.d.ts` together.

### The API layer of a feature

- Write the queries and mutations of a feature in its `api.ts`. If the
  feature has more than one entity, use one `api/<entity>.ts` for each
  entity (refer to `features/packages/api/`). Each key, cache change, and
  `staleTime` then has one location.
- In a description, call `request(api.…)` directly in `queryFn` or
  `mutationFn`. The feature has no separate HTTP layer, because it would
  only repeat the descriptions.
- Components and hooks import only the descriptions of their feature. Only
  the API files and `src/shared/api/auth.ts` import `api` and `request`.
  ESLint (`@typescript-eslint/no-restricted-imports`) enforces this rule.
- Give the exports of an API file these names:
    - `<entity>Keys` for the query keys: `packageKeys`, `noteKeys`.
    - A noun and `Query` for a read: `packageQuery(id)`, `inboxQuery()`.
    - A noun and `InfiniteQuery` for a list in pages:
      `filesInfiniteQuery()`.
    - A verb, the entity, and `Mutation` for a change:
      `updatePackageMutation`, `revokeSessionMutation`. Use `create`,
      `update`, `delete`, or a verb of the domain (`publish`, `install`,
      `share`, `revoke`).
- An API file exports only these names. `src/app/structure.test.ts` has a
  short list of other exports, with the reason for each. Thus, a reader
  finds each endpoint under one name.
- Wrap a read in `queryOptions` and a change in `mutationOptions`.
  TypeScript then gets the types of the variables and the data from the
  description.
- The default `staleTime` is 30 seconds. If an item changes rarely, set a
  longer `staleTime` in its description. The exception then stays adjacent
  to the call.
- To send a file, make the body with `multipart({ File: file })`. The
  contract types a multipart body as an object of strings. Thus, `multipart`
  keeps the only cast in one location.

### Reads

- Show the states of a read with `QueryState` from `@shared/ui/QueryState`:
  `<QueryState query={x}>{(data) => …}</QueryState>`. Do not write a
  `Switch` with `LoadError` for a read. Thus, all pages show an error, a
  load, and an empty list in the same way.
- If a read fails, `QueryState` shows `LoadError` in place of the data.
  `LoadError` shows the text of the error and a button that tries again.
  Thus, a failed read never looks like an empty list.
- Give the text for an empty list to `empty`, and its action to
  `emptyAction`. `QueryState` shows them in an `EmptyState`. If an empty
  array is not the empty state, give `isEmpty`.
- On the page of one item, give the text for a 404 to `notFound`.
  `QueryState` then shows it in an `EmptyState` in place of `LoadError`.
  Thus, a deleted item does not look like an error of the server.
- If a part of the page shows `LoadError` next to a form (the connections
  in `InstallModal.tsx`), keep `LoadError` there. The form stays usable, so
  the error is not a state of the whole part.
- Do not throw an error from a page to show a failed read. The layout
  catches a page that throws in `PageErrorBoundary`, and shows a general
  error page. This boundary is only for errors in the code. A failed read
  must show the error of the query and a button that tries again.
- Show the load state with `query.isPending` and the error with
  `query.isError`. Do not use `!query.data` for the load state, because a
  query can have no data after an error.
- Do not put `<Suspense>` in a page or around a page. A query keeps its
  `data` in a Solid resource. Under `<Suspense>`, a read of `data` before the
  first answer stops the page and shows the fallback. A new key (a new search,
  another item) then replaces the shown page with the fallback.
  `PageLoading` shows the load of the page code without `<Suspense>`.
- To show that data loads, give `QueryState` a `placeholder` (`[]` for a
  list). The children then get the placeholder in a `SkeletonScope` while
  the query is pending, and shared components show their loading form.
  Thus, the page keeps its shape, and the content does not jump when the
  data comes.
- Without a `placeholder`, `QueryState` shows nothing, or the `loading`
  text, while the query is pending. Use this form if the children cannot
  show a loading form.
- `QueryState` shows `LoadError` outside the scope for an error. The
  loading form needs the components on the page, and an error is not a
  load.
- If a part of the page loads without `QueryState`, wrap it in
  `SkeletonScope` with `when={query.isPending}`.
- Keep a static `PageHeader` outside `QueryState`. The scope makes its part
  inert, and the layout cannot move the focus to an inert `h1`.
- The scope hides its part from screen readers and announces one
  "Loading…" for it. Thus, a screen reader does not read the bars.
- If a shared component shows data, give it a loading form under
  `useSkeleton()`. Do not give it a `loading` prop. The scope makes the
  part inert and announces the load, and a prop does not do these steps.
  `SessionsPage` is the example.
- Add `SkeletonProps` to the props of such a component, and give its props
  to `useSkeleton(props)`. Then `skeleton={false}` turns off the loading
  form of that component only. Examples: a `Card` around a `Table` shows
  the rows of bars of the table, and `PageHeader hero` puts its own loading
  form in a patterned `Card`.
- If a list comes one page at a time, use `createPagedList(describe)` from
  `@shared/api/paged-list`. `describe` gives the `…InfiniteQuery` description
  from the API file of the feature, with `cursorPages`. The helper adds
  the pages to the list. A new search is a new key, and Query cancels the
  request for the old key. Thus, a page does not keep a cursor or a
  stale-answer guard of its own.
- Show such a list with `Paginated` from `@shared/ui/Paginated`. Do not
  write "Show more", `LoadError`, or the empty text around the list.
  `Paginated` uses the states of `QueryState`, and a failed next page shows
  under the items. Thus, all lists in pages behave in the same way.
- Use `mode="more"` (the default) for a list that grows: "Show more" adds
  the next page. Add `auto` to load the next page when the end of the list
  comes into view (the Explore cards).
- Use `mode="pages"` to show one page with "Previous" and "Next".
  "Previous" shows a page from the cache without a request. "Next" asks only
  for a page that is not in the cache. The server gives cursors and no
  total, so the mode cannot show page numbers or jump to a page.
- Give each item `paginatedItem`: `<Row props={paginatedItem}>`,
  `<Masonry itemProps={paginatedItem}>`, or `<li {...paginatedItem}>`.
  After "Show more", the focus goes to the first new item. After a change of
  page, the list scrolls to its top and the focus goes to its first item.
  Thus, a keyboard user does not start again at the top of the page.
- `Paginated` has one live region. It says "Loaded 5 more", "No more.", or
  "Page 2".
- A new search or filter is a new key. Then `Paginated` starts on the first
  page again.
- If the list has markup of its own, use `createPagination(list, { mode })`.
  It gives the items, the page, `next`, `prev`, `loadMore`, `status`, and
  the `root` ref for the list element.
- If such a list shows the newest item first (for example, runs), use
  `refreshHead` for a new item. `refreshHead` gets the first page again and
  puts the new item at the top.
- If such a list shows the oldest item first (for example, files), use
  `appendItem` for a new item. The new item goes at the end of the list, and
  the first page does not contain it.
- If one item changes or goes away, use `patchItem` or `removeItem`. Do not
  invalidate the list for these changes. An invalidation fetches all the
  loaded pages again, one after the other.

### Changes

- To build a form, use `createForm` from `@shared/ui/forms/form`. Spread its
  bindings on the controls. Thus, each field is one line, and the ids, the
  values, the errors, and `disabled` are the same in all forms.
- Use `form.input(name)` for `Field` and `TextArea`. Use
  `form.control(name)` for `Select`, `RadioGroup`, `TimeZoneField`,
  `MarkdownEditor`, and `Combobox`. Use `form.toggle(name)` for `Checkbox`
  and `Switch`. The id of a field is `<id>-<name>`. The field names come
  from `initial`, and TypeScript refuses a name that is not there.
- Do not destructure a binding. Do not copy it into a new object. Its props
  are getters, and a spread keeps them. A copy does not change when the
  form changes.
- Do not make one signal for each field. The form keeps the values in one
  store.
- Give the saved values to `initial`, for example
  `() => ({ name: props.user.name })`. Do not copy them with `createEffect` or
  `createMemo`. If the saved values change, a field that the user did not
  change takes the new value. A changed field keeps the value of the user.
  Thus, a save in a different card does not remove an edit.
- Put `<ErrorSummary {...form.summary} />` at the top of the form. The
  summary sorts the errors in the order of the fields. Thus, the focus goes
  to the first field with an error on the page.
- Write the submit with `form.onSubmit(send)`. In `send`, call `run` of
  `form.mutation(describe)` and return its result. `onSubmit` stops the
  native submit and does nothing while the form is busy. Thus, a form does
  not send two times.
- Put a check in the browser in the `check` option. It returns a message
  for each field that is not correct. The messages show as the errors of
  the server do, and nothing goes to the server. Do not add a validation
  library. The server validates all data, and a second set of rules would
  not agree with it.
- A form in a `Modal` saves with its own `form.mutation`. Do not give it
  the `busy` or the `errors` of the parent. Thus, a failed save shows in
  the modal, and the modal stays open.
- If the fields come from the data (for example, one `Select` for each
  connection), keep one field with a record of the values. Then use only
  `onSubmit`, `summary`, and `busy`. A binding needs a field name that
  `initial` knows when the form starts. Refer to `InstallModal.tsx`.
- If the server uses a different name for a field, give the names in
  `serverFields`, for example `{ password: 'newPassword' }`. The errors of
  the server then show under the correct field.
- Use `form.dirty()` or `form.filled()` to disable the save button. Use
  `form.changed()` to send only the changed fields. After a save,
  `form.done()` is true until the next edit. Show it in a `role="status"`
  line. To clear the form, call `form.reset()` in `onOk`.
- `createForm` uses `createSubmit(fields)` from `@shared/api/submit`, and
  gives its `mutation`, `busy`, `errors`, and `setErrors`. If an action has
  no form and no dialog (a remove button), use `createSubmit()` directly. Give
  each mutation description to `submit.mutation(describe)`. Its
  `run(vars, onOk)` sets `busy`, runs the mutation, and groups the errors.
  The save code is then the same in all forms and actions.
- Put the cache changes (`setQueryData`, `invalidateQueries`,
  `removeQueries`) in the `onSuccess` of the description. A mutation then
  changes the cache in the same way from each page that uses it.
- Put only the steps of the form (close a dialog, go to a page) in `onOk`.
  `onOk` runs after `onSuccess`.
- If `onSuccess` returns the promise of a new fetch, `busy` stays true until
  the fetch is complete. Thus, the form does not show old data.
- The page shows each error below its field (`groupErrors`). It shows the
  other errors at the top of the form. The text of an error comes from its
  code: `errors.<code>` in the locale files. The message from the server is
  the fallback.
- If one error needs a special display, give `run` an `onFail` function. If
  `onFail` returns a value, the form shows that value. Refer to the "unchanged"
  conflict in `PublishModal.tsx`. This keeps the special case adjacent to the
  call.
- Each action shows its errors. Do not ignore a failed result. If the user
  does not see the failure, the user thinks that the action was successful.
- If an action has a `ConfirmDialog`, use `createConfirm(describe, vars,
onOk)` from `@shared/ui/ConfirmDialog`. Open the dialog with `ask(item)`,
  and spread `dialog` on the `ConfirmDialog`. Thus, the page does not write
  an item signal, a cancel function, or `setErrors({})`.
- `createConfirm` closes the dialog only after a success. A failure stays in
  the dialog, and the user can try again or cancel. Cancel and the next
  `ask` clear the errors. Thus, no dialog closes on a failure.
- Put the page steps (go to a page) in `onOk` of `createConfirm`. `onOk`
  runs after the dialog closes. Refer to `PackageSettings.tsx`.
- If the action has no dialog, put an `ErrorSummary` adjacent to the action
  or above the list. Refer to `SessionsPage.tsx`.
- `pending(work)` only sets `busy`. If you use it, show the errors with
  `setErrors`.
- If each row of a list saves on its own, use `createSubmit()` and
  `runFor(key, vars, onOk)` with the ID of the row as the key. Do not use
  `createForm` for these rows. One `createForm` is for one form. `busy(key)`
  and `errors(key)` then apply only to that row. `busy()` is true if a save is in progress. Thus, one row that
  saves or fails does not stop the other rows. Refer to
  `PackageWorkflowList.tsx`.

### The session

Each session has its own `QueryClient`. When the user signs in or signs out,
`SessionProvider` (`src/shared/api/session-provider.tsx`) makes a new client
and the page tree again. The data of the previous user goes away with the old
tree.

- Change the user only with `startSession` and `endSession`. `loginMutation`
  and `logoutMutation` in `src/shared/api/auth.ts` call them. A different
  change would keep the cache of the previous user.
- Get the user with `useAuth()` from `@shared/api/auth`. The user is a query
  in the cache. Thus, many components can call `useAuth()` without more
  requests.
- Keep user data in Query, or in a component under `SessionProvider`. The
  new tree then starts without the data of the previous user.
- If a module must keep user data, use `sessionScoped(make)` from
  `@shared/api/session-provider`. It makes a new value for each session.
- Do not put `createSignal` or `createStore` at the top of a module in
  `src/features/`. ESLint (`no-restricted-syntax`) enforces this rule. A
  module signal stays when the user changes, and the next user sees its
  value.
- To keep user data in `localStorage`, use `sessionStore(name)`. It adds the
  user ID to the key. Thus, a different user on the same computer does not
  see the data.
- To reset an external system (for example, the user of an error report)
  for a new user, use `onSessionChange`. The system cannot go in the page
  tree, so it needs a separate reset.
- A page that needs a session has `auth: true` in `src/app/pages.ts`.
  `Router.tsx` then adds `requireAuth`. Parts of a page use `SignedIn` and
  `SignedOut`.

## i18n (translations)

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
stop in `src/shared/consent/optional-services.ts`. They use the categories in
`src/shared/consent/consent.ts`. A new optional service must have:

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
    - `path` and `component`, with
      `lazyPage(() => import('@features/<name>/XPage'))`. Do not use `lazy`.
      `lazyPage` tells the layout that the page code is on its way. Thus, the
      layout announces the load and moves the focus when the page is ready.
    - The `skeleton` option of `lazyPage`: the shape that the page shows
      while its code loads, for example
      `lazyPage(() => import('…'), { skeleton: 'table' })`. Select the form
      that agrees with the content of the page: `table`, `cards`, `list`,
      `settings`, `detail`, or `document`. The default is `header`. The
      shape comes after 200 ms. Thus, a fast load shows nothing, and a slow
      load does not show an empty page. The form also sets the width of
      the page.
    - `auth: true` if the page needs a session.
    - `nav` if the page shows in the sidebar: an icon, an i18n key with its
      English text, and a `group` if the page is in a sub-menu.
    - `public: true` if search engines must find the page.
3. If the page is not in the sidebar, add a link to it in the footer
   (`src/app/Footer/Footer.tsx`) or on another page.
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

The test setup loads the English strings before each component test file.
Thus, a page in a test shows the text from `en.json`, as in the app. If the
strings loaded during a test, the result of the test would change with the
load time.

Each component test includes the axe check:
`await expectNoA11yViolations()` from `src/shared/testing/axe.ts`. The check
finds controls without names, fields without labels, and incorrect ARIA.
The check does not examine colour contrast. jsdom does not paint, and
`palette.test.ts` examines the contrast of the tokens.

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
