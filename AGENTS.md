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

- `src/app/`: the entry point, the layout, the routes (`Router.tsx`), the
  navigation, and the footer.
- `src/features/<name>/`: one feature. A feature contains these items:
    - `XPage.tsx`. This file only assembles the page.
    - `components/`.
    - `api.ts`.
    - `<name>.scss`.
    - Tests, adjacent to the code.
- `src/shared/`: `api/`, `i18n/`, `ui/`, `nav/`, `theme/`, `lib/`, `styles/`,
  `meta/`, `testing/`.
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
- Send API calls through `api` and `send()` from `shared/api/client.ts`. Put
  these calls in the `api.ts` file of the feature.

### UI and styles

- Before you write new markup, use the components in `src/shared/ui`:
  Button, Field, Modal, ConfirmDialog, Card, Table, EmptyState, PageHeader,
  Switch.
- Each page starts with `PageHeader`. Each page sets its title with
  `useRootMeta()`.
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
- Add new keys only to the English files: `<lang>.json` or
  `<page>.en.json`. Weblate supplies the other languages.
- If you remove a key or change its name, do this in all language files.

### Privacy and public pages

- Code that collects visitor data must go through `shared/lib/consent.ts` and
  `optional-services.ts`.
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
