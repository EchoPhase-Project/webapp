# Data and the API

This file tells how the webapp reads and changes data through TanStack Query,
and how the session keeps the data of each user apart.

[Back to CONTRIBUTING.md](../../CONTRIBUTING.md)

Contents:

- [The API contract](#the-api-contract)
- [The API layer of a feature](#the-api-layer-of-a-feature)
- [Reads](#reads)
- [The session](#the-session)

## The API contract

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

## The API layer of a feature

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

## Reads

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

## The session

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
