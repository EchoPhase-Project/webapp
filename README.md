# EchoPhase webapp

The web client of [EchoPhase](https://github.com/EchoPhase-Project/server)
(SolidJS + Vite), served by nginx, which also proxies `/api` (the realtime
gateway socket, `/api/v1/gateway`, included) to the server (`API_UPSTREAM`,
default `echophase:8080`).

The image reads its settings from the environment at start:
`API_UPSTREAM` (the server), and for error reports to GlitchTip
`SENTRY_DSN` (empty: none, and the SDK is not loaded), `ERRORS_UPSTREAM`
(GlitchTip's host:port, a full name such as
`glitchtip.monitoring.svc.cluster.local:80`) and `ERRORS_PROJECT` (its project
id). Browsers send reports to `/errors` on the webapp itself, so GlitchTip
needs no public address. Visit statistics go to Umami the same way:
`UMAMI_WEBSITE_ID` (empty: no tracker loaded) and `UMAMI_UPSTREAM` (its
host:port, a full name); the tracker and its reports use `/stats/` on the
webapp, without cookies and honouring Do Not Track.

Run it with the rest of EchoPhase: [charts](https://github.com/EchoPhase-Project/charts)
(Helm, Docker Compose); the image is `ghcr.io/echophase-project/webapp`.

## Development

Tools and tasks are defined for [mise](https://mise.jdx.dev):

```bash
mise install --locked          # Node, oras, woodpecker-cli as in mise.lock
mise run install               # npm ci
mise run dev                   # Vite dev server on :5173
```

The dev server proxies `/api` (and the gateway socket) to a server at
`API_TARGET`, by default `http://localhost:8080`. Pages for trying out
components are under `/dev/*` (`src/dev/`); only the dev server has them, a
build leaves them out.

| Task                                                      | What                                                                             |
| --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `contract:pull [--version v]`                             | download the server's API contract (`./api-version`) to `artifacts/openapi.json` |
| `gen:api`                                                 | regenerate `src/shared/api/schema.d.ts` from it                                  |
| `check`                                                   | contract types up to date, `tsc`, ESLint, tests, build                           |
| `test`, `test:coverage`                                   | Vitest tests (`src/**/*.test.ts[x]`); coverage to `artifacts/coverage`           |
| `coverage:html`                                           | the same as a browsable report: `artifacts/coverage/index.html`                  |
| `docker:build`, `docker:push [--tag t]`, `docker:publish` | the webapp image                                                                 |
| `image-tag`, `docker:info`                                | this checkout's image tag                                                        |
| `ci:image`, `ci:run`                                      | Woodpecker step image, manual pipeline run                                       |

### Layout of `src/`

| Folder             | What                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/`             | entry (`main.tsx`), `Root` (head), `Layout`, routes and providers                                                                              |
| `features/<name>/` | one feature each: its pages, components, styles and tests (`auth`, `home`, `sessions`, `api-clients`, `realtime`, `maintenance`)               |
| `shared/`          | what features share: `api/` (typed client, auth, outage watch), `i18n/`, `theme/`, `nav/`, `ui/`, `lib/`, `styles/`, `testing/` (test helpers) |
| `dev/`             | pages for trying out components, dev server only                                                                                               |
| `static/`          | fonts, icons, and the translations (`locales/`, written by Weblate)                                                                            |

Inside a feature, `XPage.tsx` only puts the page together (title, layout);
its parts are in `components/`, its API calls in `api.ts`, and logic worth
testing in plain modules with tests beside them (`sessions/user-agent.ts`).
`shared/ui` holds the building blocks: `Button` (primary, ghost, icon),
`Card`, `Field` (input with icon and its errors under it), `Modal` (forms
over the page), `EmptyState`, `Table`. The flowing-lines pattern
(`.patterned`, or `Card patterned`) is for brand moments only: the sign-in
card, empty states, the outage screen; not on tables, menus, forms in pages
or small controls.

Imports go through the aliases `@app/`, `@features/`, `@shared/`, `@dev/`,
`@static/` (tsconfig `paths`, which Vite reads), or `./` within a folder.
ESLint keeps the layers apart: a feature imports `shared/` and itself, never
another feature (move what two need into `shared/`); `shared/` imports no
feature.

The API is called through `api` in `shared/api/client.ts` (openapi-fetch over
`schema.d.ts`): paths, parameters and bodies are checked against the contract,
the CSRF token and cookies go along, and `send()` turns an answer into
`{ ok, data }` or `{ ok, errors }`.

Tests sit next to what they test (`*.test.ts[x]`). Component tests render with
`renderPage` and answer API calls with `fakeApi` (`shared/testing/`), in jsdom.

### The API contract

The client is typed against a released server contract, an OCI artifact
(`ghcr.io/echophase-project/openapi:<version>`). `api-version` says which:
bump it, `mise run gen:api`, fix what the compiler finds, commit both. To work
against unreleased server changes, point at the local registry:

```bash
CONTRACT_REPO=localhost:30500/echophase/openapi CONTRACT_VERSION=latest mise run gen:api
```

## CI and releases

- **GitHub Actions**: every push and PR checks the contract types, `tsc`,
  ESLint, tests and the build, and uploads coverage to
  [Codecov](https://app.codecov.io/gh/EchoPhase-Project/webapp); tags `vX.Y.Z`
  publish the image to GHCR.
- **Woodpecker** (the project's own cluster): on `main` builds the image into
  the in-cluster registry and commits its tag to
  [deploy](https://github.com/EchoPhase-Project/deploy), from where Flux
  deploys it.
