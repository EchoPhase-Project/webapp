# EchoPhase webapp

The web client of [EchoPhase](https://github.com/EchoPhase-Project/server)
(SolidJS + Vite), served by nginx, which also proxies `/api` and `/gateway` to
the server (`API_UPSTREAM`, default `echophase:8080`).

Run it with the rest of EchoPhase: [charts](https://github.com/EchoPhase-Project/charts)
(Helm, Docker Compose); the image is `ghcr.io/echophase-project/webapp`.

## Development

Tools and tasks are defined for [mise](https://mise.jdx.dev):

```bash
mise install --locked          # Node, oras, woodpecker-cli as in mise.lock
mise run install               # npm ci
mise run dev                   # Vite dev server
```

| Task                                                      | What                                                                             |
| --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `contract:pull [--version v]`                             | download the server's API contract (`./api-version`) to `artifacts/openapi.json` |
| `gen:api`                                                 | regenerate `src/lib/api/schema.d.ts` from it                                     |
| `check`                                                   | contract types up to date, `tsc`, ESLint, build                                  |
| `docker:build`, `docker:push [--tag t]`, `docker:publish` | the webapp image                                                                 |
| `image-tag`, `docker:info`                                | this checkout's image tag                                                        |
| `ci:image`, `ci:run`                                      | Woodpecker step image, manual pipeline run                                       |

### The API contract

The client is typed against a released server contract, an OCI artifact
(`ghcr.io/echophase-project/openapi:<version>`). `api-version` says which:
bump it, `mise run gen:api`, fix what the compiler finds, commit both. To work
against unreleased server changes, point at the local registry:

```bash
CONTRACT_REPO=localhost:30500/echophase/openapi CONTRACT_VERSION=latest mise run gen:api
```

## CI and releases

- **GitHub Actions**: every push and PR checks the contract types, `tsc` and
  the build; tags `vX.Y.Z` publish the image to GHCR.
- **Woodpecker** (the project's own cluster): on `main` builds the image into
  the in-cluster registry and commits its tag to
  [deploy](https://github.com/EchoPhase-Project/deploy), from where Flux
  deploys it.
