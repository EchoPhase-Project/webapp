# 0010. All API calls through TanStack Query, and a new client per session

- Status: Accepted
- Date: 2026-11-14

## Context

Data loading was assembled by hand in each feature: 17 `createResource`
calls in 14 files, global "version" signals to make lists reload after a
change, cursor paging with `generation` counters, checks for stale answers
instead of cancellation, and `ApiResult` values folded into `[]` or `null`
with `dataOr`. Every feature solved caching, reloads after changes, paging
and realtime updates in its own way.

A second problem was the change of user. Data of the previous user could
stay in a cache, in a component or in a module variable after a sign-out
and a sign-in as someone else.

## Decision

- Every call to the API is a TanStack Solid Query query or mutation: reads,
  writes, sign-in and sign-out included. Components never call `api` or
  `request`; they use the descriptions (`…Keys`, `…Query`, `…Mutation`) in
  the feature's `api.ts`. ESLint enforces it.
- `request()` returns data or throws `ApiError`; `send`, `ApiResult` and
  `dataOr` are gone.
- Each session gets its own `QueryClient`. `startSession` and `endSession`
  replace the client and remount the tree under it, so the cache and the
  component state of the previous user go with the old tree. State outside
  the tree goes through `sessionScoped`, `sessionStore` and
  `onSessionChange`.
- `staleTime` is 30 s by default; a description sets its own value where
  the data changes rarely (`meQuery` 5 min, a published package version
  `Infinity`). The cache is not persisted between page loads.

## Alternatives considered

- **The router's own cache** (`query()`, `createAsync`, `revalidate` of
  `@solidjs/router`): lighter and already a dependency, but paging, mutation
  state, invalidation by key prefix, stale times and devtools would all be
  ours to write.
- **Clearing the cache by hand on sign-out**: every new cache, module
  variable or stored value would have to remember to clear itself; a new
  client and tree make it hold by construction.
- **Persisting the cache** (`persistQueryClient`): faster after a reload,
  but it puts a user's packages, notes and sessions in browser storage on a
  shared computer, and conflicts with a client per session.
- **Waiting for Solid 2 and Query 6**: Solid 2 was a release candidate. All
  Query use sits in the `api.ts` files, so the later move edits those files,
  not every component.

## Consequences

- A package, workflow or list is fetched once however many components show
  it, and a revisit shows cached data at once while it refreshes.
- Changes reach every list through invalidation or cache patches in the
  mutation's `onSuccess`, not through hand-written `mutate` calls.
- One error type (`ApiError`) everywhere.
- A sign-out remounts the app; anything that must survive it has to be
  outside the session on purpose.
- The rules (descriptions in `api.ts`, no `createSignal` at the top of a
  feature module, no direct `api` import) are in `docs/contributing/data.md`
  and ESLint. Loading states without `<Suspense>` are in
  [0001](0001-query-without-suspense.md).
