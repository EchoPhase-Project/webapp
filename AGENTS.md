# AGENTS.md: EchoPhase webapp

This repository contains the EchoPhase web client. The client uses SolidJS
and Vite, and nginx serves it. The full rules for persons are in
[CONTRIBUTING.md](CONTRIBUTING.md). This file is the short version for coding
agents. If this file and CONTRIBUTING.md are different, CONTRIBUTING.md and the
code are correct. Then correct this file.

## Commands

Get the tools from mise. Run `mise install --locked`, then run
`mise run install`.

| Task                     | Command                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Run all CI checks        | `mise run check` (contract types, tsc, ESLint, Prettier, tests, build)                    |
| Examine the types        | `npx tsc --noEmit -p .`                                                                   |
| Run the linter           | `npm run lint`                                                                            |
| Format the code          | `npm run format` (to examine the format only, run `npm run format:check`)                 |
| Run the tests            | `mise run test` (Vitest gets all extra arguments)                                         |
| Start the dev server     | `mise run dev` (it sends `/api/` to `API_TARGET`, the default is `http://localhost:8080`) |
| Make the API types again | `mise run gen:api` (first, run `mise run contract:pull`)                                  |

Before you stop, make sure that the type check, the linter, the format check,
and the tests are successful.

## Layout

- `src/app/`: the entry point, the layout, the routes (`Router.tsx`), and
  the navigation. These skeleton files stay flat. The header, the footer, and
  the brand tile are in folders: `Header/`, `Footer/`, `BrandTile/`.
- `src/features/<name>/`: one feature. A feature contains these items:
    - `XPage.tsx`. This file only assembles the page.
    - `components/`.
    - `api.ts`, or `api/<entity>.ts` if the feature has more than one
      entity.
    - `<name>.scss`.
    - Tests, adjacent to the code.
- `src/shared/`: `api/`, `consent/`, `i18n/`, `ui/`, `nav/`, `theme/`, `lib/`,
  `styles/`, `meta/`, `testing/`.
- `src/shared/lib/`: helpers that have no domain. If a helper belongs to a
  domain (the API layer, consent, one component), put it in the folder of
  that domain.
- `src/shared/ui/<Name>/`: one shared component, in a folder. Thus, the
  import is `@shared/ui/<Name>`.
- `src/shared/ui/forms/`: the form controls and `forms.scss`, which they
  share. Import them as `@shared/ui/forms/<Name>`.
- `src/shared/ui/icons.ts`: all icons.
- `src/dev/`: the component playground. It is only in the dev server.
- `src/static/locales/`: the translations.

## Rules

### Imports

- Import through the aliases: `@app`, `@features`, `@shared`, `@dev`,
  `@static`. Do not use `../`.
- A feature imports only `shared` and its own files.
- `shared` does not import features or `app`.
- ESLint enforces these rules.

### Solid

- Do not destructure props. Read `props.x` in JSX or in effects. Use
  `splitProps`.
- The `solid/reactivity` rule causes an error.

### API

- Do not edit `src/shared/api/schema.d.ts`. The generator makes this file from
  the server contract.
- Do not write response types manually in `shared/api/types.ts`.
- All API calls go through TanStack Query. Write the descriptions of a
  feature in its `api.ts` or `api/<entity>.ts`.
- Import `api` and `request` from `shared/api/client.ts` only in these API
  files and in `shared/api/auth.ts`. Components import the descriptions.
  ESLint enforces this rule.
- Give the exports these names: `<entity>Keys`, `<noun>Query`,
  `<noun>InfiniteQuery`, `<verb><Entity>Mutation`. For other exports,
  `src/app/structure.test.ts` has a short list.
- To send a file, use `multipart(fields)`. Do not write `as unknown as` for
  a body.
- If a description needs a different `staleTime`, set it in the
  description.
- If a read fails, show `LoadError` in place of the data.
- If a list comes one page at a time, use `createPagedList(describe)` from
  `shared/api/paged-list.ts`. Write the `…InfiniteQuery` description with
  `cursorPages`.
- If such a list shows the newest item first, use `refreshHead` for a new
  item. If it shows the oldest item first, use `appendItem` for a new item.
- To change or remove one item, use `patchItem` or `removeItem`. Do not
  invalidate the list.
- To save a form, use `createSubmit(fields)` from `shared/api/submit.ts`.
  Then use `submit.mutation(describe)` and its `run(vars, onOk)`.
- Put the cache changes in the `onSuccess` of the description. Put only the
  form steps (close, go to a page) in `onOk`.
- If each row of a list saves on its own, use `runFor(key, vars, onOk)`.
  `busy(key)` and `errors(key)` then apply only to that row.
- Each action shows its errors. Do not ignore a failed result. If the action
  has a `ConfirmDialog`, give it `errors`, and close it only in `onOk`. If
  the action has no dialog, show an `ErrorSummary` adjacent to it.

### Session

- Change the user only with `startSession` and `endSession`.
- Keep user data in Query, in a component under `SessionProvider`, or in
  `sessionScoped` from `shared/api/session-provider.tsx`.
- Do not put `createSignal` or `createStore` at the top of a feature
  module. ESLint enforces this rule.
- To keep user data in the browser storage, use `sessionStore`.
- To reset an external system for a new user, use `onSessionChange`.

### UI and styles

- Before you write new markup, use the components in `src/shared/ui`:
  Button, HeaderButton, Tabs, NavTabs, Field, TimeZoneField, TextArea,
  MarkdownEditor, Select, Checkbox, RadioGroup, Modal, ConfirmDialog, Card,
  SettingsCard, ShareList, RemoveButton, BackLink, Table, EmptyState,
  PageHeader, Switch, LoadError.
- If a component has its own stylesheet, give it a folder `<Name>/`. The
  folder contains `<Name>.tsx`, its `.scss`, its tests, and `index.ts`. This
  rule applies to `src/shared/ui` and to `src/app`.
- `index.ts` exports the default export and the named exports of the
  component.
- If a component uses `forms.scss`, put it in `src/shared/ui/forms/`. Do not
  give it a folder.
- If only the app uses a component, put it in `src/app/`. Do not put it in
  `src/shared/ui`.
- On a settings page, put each part in a `SettingsCard`. Do not make a
  `Card` with an `h2` for it.
- Do not write `<button>`, `<select>`, `<textarea>`, or a checkbox or radio
  `<input>` outside `src/shared/ui` and `src/shared/nav`. ESLint enforces
  this rule.
- If a full card or row opens an item, it can be a `<button>`. Then disable
  the rule on that line and write the reason.
- If a `ConfirmDialog` asks about one item, give it `item` and
  `onConfirm(item)`. Do not use `open={!!x()}` and `x()!`.
- Import each icon from `@shared/ui/icons`. Only `icons.ts` imports an icon
  library. ESLint enforces this rule.
- To show an API time, use `useDateFormat()` from `@shared/lib/date-format`.
- Before you write a debounce, a click-outside close, or a copy button, use
  the helper in `src/shared/lib`: `createDebounced`, `createDismiss`,
  `createClipboard`.
- Each page starts with `PageHeader`.
- Each page sets its title and description with
  `usePageMeta(() => ({ title, description }))`. Do not add " · EchoPhase".
- Put the content of a page in an element with the `page-stack` class.
- Before you copy a style rule, examine the mixins in
  `shared/styles/mixins.scss` (`mix.input-frame`, `mix.plain-list`).
- For a row of buttons, use the `actions-row` class (add
  `actions-row--end` for the right side). For a small label, use `badge`.
  For a status word, use `pill pill--ok` (or `--bad`, `--busy`, `--quiet`).
- Use only the colour tokens in `shared/styles/tokens.scss`. The tokens
  include the two themes. `palette.test.ts` examines the contrast.
- Do not use hex colours in components.
- All stylesheets are global. Start each class name with the name of the
  component or the feature.
- Do not apply styles to bare elements outside `global.scss`.
- Use the `.patterned` background only for brand areas: the sign-in card,
  empty states, the outage screen, and the About page.

### Accessibility

- The keyboard must get access to all controls.
- The focus must be visible.
- All fields must have labels.
- Do not use colour as the only signal.
- Animations must obey `prefers-reduced-motion`.

### Translations

- Send each string that the user sees through i18n:
  `t('key', 'English fallback')`.
- If a string contains a value, give the value to `t()`:
  `t('key', 'Delete {name}', { name })`. Do not use `.replace()` on the result.
- Words that many pages show are `ui.*` keys in `<lang>.json`:
  `t('ui.delete', 'Delete')`. Do not copy them to a page file.
- Add new keys only to the English files: `<lang>.json` or
  `<page>.en.json`. Weblate supplies the other languages.
- If you remove a key or change its name, do this in all language files.

### Privacy and public pages

- Code that collects visitor data must go through `shared/consent/consent.ts`
  and `shared/consent/optional-services.ts`.
- If you add a public page, add an `Allow:` line for it in
  `public/robots.txt`.

### Tests

- Start each component test with `// @vitest-environment jsdom`.
- Use `fakeApi()` and `renderPage()` from `shared/testing`.

## Commits

Use Conventional Commits. CI examines the commit messages.

- Use these types: `feat:`, `fix:`, `refactor:`, `perf:`, `docs:`, `test:`,
  `ci:`, `build:`, `chore:`.
- Add a scope if it helps the reader, for example `fix(i18n): …`.
- Mark incompatible changes with `!`.
