# 0001. TanStack Query without `<Suspense>`; `lazyPage` and skeletons for loading

- Status: Accepted
- Date: 2026-11-17

## Context

All API data goes through TanStack Solid Query. In Solid Query v5 a query's
`data` is backed by a Solid resource, so reading `data` under a
`<Suspense>` boundary suspends that boundary until the first answer. A new
query key (a new search, another item) suspends it again and replaces the
page that is already on screen with the fallback.

Pages are also loaded lazily, one chunk each. We wanted the user to see
something meaningful while a page's code or data loads, without the page
flashing for fast loads and without a blank screen for slow ones.

## Decision

- No `<Suspense>` in or around pages. A page shows its data state with
  `query.isPending` and `query.isError`, through `QueryState`.
- Pages are registered with `lazyPage(load, { skeleton })` instead of
  `lazy`. While the code loads, the layout announces "Loading…" and, after
  200 ms, the page's rough shape (`PageSkeleton`) appears.
- While data loads, `QueryState` with a `placeholder` renders the page's
  own components inside a `SkeletonScope`, and the shared components show
  their loading form (bars in the shape of their content).

## Alternatives considered

- `<Suspense>` around each page: the standard Solid pattern, but with Query
  it blanks a page on every key change.
- A spinner for every load: simple, but the content jumps when it arrives
  and a fast load still flashes.
- A `loading` prop on each component: see [0008](0008-skeleton-prop.md).

## Consequences

- A structure test fails on any `Suspense` import (except the test that
  shows why) and on `lazy(` in `pages.ts`.
- Every shared component that shows data needs a loading form.
- The static `PageHeader` stays outside `QueryState`, so the focus can land
  on a real, non-inert `h1`.
