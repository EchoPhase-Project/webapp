# Contributing to the EchoPhase webapp

Thank you for your help with the web client of EchoPhase. This guide tells how
to start and how to send a change. The rules for the code are in
`docs/contributing/`. The rules for all repositories
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

## The rules

The rules for the code are in `docs/contributing/`, one file for each
topic:

| File                                                   | Topic                                                                                   |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [layout.md](docs/contributing/layout.md)               | The folders, the imports, the folders of the components, the frame, and the page widths |
| [code-style.md](docs/contributing/code-style.md)       | Formatting, names, comments, the shared helpers, the developer aids                     |
| [ui.md](docs/contributing/ui.md)                       | The shared components, the controls, the panels, the list controls, the icons           |
| [styles.md](docs/contributing/styles.md)               | The colour tokens, the class names, the mixins, the shared classes, the grids           |
| [a11y.md](docs/contributing/a11y.md)                   | The keyboard, the focus, the names of controls, the live regions                        |
| [data.md](docs/contributing/data.md)                   | The API contract, the API layer, the reads, the lists in pages, the session             |
| [forms.md](docs/contributing/forms.md)                 | Forms, changes, and the errors of an action                                             |
| [i18n.md](docs/contributing/i18n.md)                   | The translations                                                                        |
| [privacy.md](docs/contributing/privacy.md)             | The services that collect visitor data                                                  |
| [docs-articles.md](docs/contributing/docs-articles.md) | The help articles of the `/docs` page and their links                                   |
| [new-page.md](docs/contributing/new-page.md)           | The steps to add a page                                                                 |
| [tests.md](docs/contributing/tests.md)                 | The tests and their tools                                                               |

The reasons for the large decisions are in `docs/adr/`.

A test (`src/app/doc-links.test.ts`) examines the links in these files. If a
link goes to a file or a heading that is not there, the test fails.

## Commits and pull requests

Commit messages follow Conventional Commits (`feat:`, `fix:`, `refactor:`,
`feat!:` for incompatible changes). CI examines them. The release notes come
from them.

Make only one change in each pull request. Add screenshots of the changed
screens in the two themes.

The maintainers make the releases with tags `vX.Y.Z`. A tag publishes the
image to `ghcr.io/echophase-project/webapp` and makes a GitHub release.
