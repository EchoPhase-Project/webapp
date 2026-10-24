# AGENTS.md: EchoPhase webapp

SolidJS + Vite web client of EchoPhase, served by nginx. Humans read
[CONTRIBUTING.md](CONTRIBUTING.md); this file is the short version for coding
agents. When the two disagree, CONTRIBUTING.md and the code win: fix this file.

## Commands

Tools come from mise (`mise install --locked`, then `mise run install`).

| Goal                 | Command                                                                           |
| -------------------- | --------------------------------------------------------------------------------- |
| Everything CI checks | `mise run check` (contract types, tsc, ESLint, Prettier, tests, build)            |
| Type check           | `npx tsc --noEmit -p .`                                                           |
| Lint                 | `npm run lint`                                                                    |
| Format               | `npm run format` (check: `npm run format:check`)                                  |
| Tests                | `mise run test` (extra arguments go to Vitest)                                    |
| Dev server           | `mise run dev` (proxies `/api/` to `API_TARGET`, default `http://localhost:8080`) |
| Regenerate API types | `mise run gen:api` (after `mise run contract:pull`)                               |

Before you finish: type check, lint, format check and tests pass.

## Layout

- `src/app/`: entry, layout, routes (`Router.tsx`), navigation, footer.
- `src/features/<name>/`: one feature: `XPage.tsx` (only assembles the page),
  `components/`, `api.ts`, `<name>.scss`, tests beside the code.
- `src/shared/`: `api/`, `i18n/`, `ui/`, `nav/`, `theme/`, `lib/`, `styles/`,
  `meta/`, `testing/`.
- `src/dev/`: component playground, dev server only.
- `src/static/locales/`: translations.

## Rules

- Import through aliases (`@app`, `@features`, `@shared`, `@dev`, `@static`),
  never `../`. A feature imports only `shared` and itself; `shared` never
  imports features or app. ESLint enforces it.
- Solid: never destructure props; read `props.x` in JSX or effects, use
  `splitProps`. `solid/reactivity` is an error.
- Do not edit `src/shared/api/schema.d.ts`: it is generated from the server's
  contract. Do not hand-write response types in `shared/api/types.ts`.
- API calls go through `api` and `send()` from `shared/api/client.ts`, in the
  feature's `api.ts`.
- Use `src/shared/ui` (Button, Field, Modal, ConfirmDialog, Card, Table,
  EmptyState, PageHeader, Switch) before writing new markup. Pages open with
  `PageHeader` and set their title with `useRootMeta()`.
- Colours only from the tokens in `shared/styles/tokens.scss` (both themes;
  `palette.test.ts` checks contrast). No hex colours in components.
- Stylesheets are global: prefix classes with the component or feature; never
  style bare elements outside `global.scss`.
- The `.patterned` background is for brand moments only (sign-in card, empty
  states, outage screen, About).
- Accessibility: keyboard reachable, visible focus, labelled fields, colour
  never the only signal, `prefers-reduced-motion` for animations.
- Every user-visible string goes through i18n: `t('key', 'English fallback')`.
  Add new keys to the English files only (`<lang>.json` or
  `<page>.en.json`); other languages come from Weblate. Removing or renaming a
  key means doing it in every language file.
- Anything that collects visitor data must go through
  `shared/lib/consent.ts` and `optional-services.ts`.
- A new public page needs an `Allow:` line in `public/robots.txt`.
- Component tests start with `// @vitest-environment jsdom`; use
  `fakeApi()` and `renderPage()` from `shared/testing`.

## Commits

Conventional Commits, checked in CI: `feat:`, `fix:`, `refactor:`, `perf:`,
`docs:`, `test:`, `ci:`, `build:`, `chore:`, scope where it helps
(`fix(i18n): …`). Mark breaking changes with `!`.
