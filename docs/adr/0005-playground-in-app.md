# 0005. The component playground inside the app, no Storybook

- Status: Accepted
- Date: 2026-11-24

## Context

Shared components need a place where each one can be seen in all its
states. The usual tool is Storybook (or Histoire, Ladle); the webapp
already had pages under `/dev` for this, built into the dev server and into
builds with `VITE_DEV_TOOLS=true`.

## Decision

Keep the playground inside the app. Every shared component has a page in
`src/dev/`, listed in `src/dev/routes.ts`, and a new shared component must
get one. A usual build contains none of it.

## Alternatives considered

- Storybook: its main gain over `/dev` is a props panel and its ecosystem
  (visual tests, docs). It costs a second build and config kept in step
  with Vite, and its Solid support is younger than for React or Vue.
- A design-system site for people outside the team: only worth it if other
  teams start using the components.

## Consequences

- The samples run with the real providers (i18n, theme, router, Query), so
  they look exactly as in the app.
- What Storybook would give for free has to be built if we want it: theme
  and width switches, screenshots in CI, "when to use" notes. These are in
  the todo list (`todo/webapp/dev-playground-next.md`).
