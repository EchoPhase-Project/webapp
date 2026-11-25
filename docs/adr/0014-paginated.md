# 0014. `Paginated`: one component for every paged list

- Status: Accepted
- Date: 2026-11-22

## Context

Each paged list put the same parts around `createPagedList` by hand: a
"Show more" button with its busy state, `LoadError` with a retry, the empty
text. Files, Explore and runs did it three slightly different ways. Other
lists (sessions, API clients, webhooks, schedules) showed only their first
page. The API pages by cursor (`nextCursor`, `hasMore`): no total, no page
numbers.

## Decision

- `Paginated` (`shared/ui/Paginated`) shows a list that comes one page at a
  time, with two modes: `more` (the default; `auto` loads when the end comes
  into view) and `pages` (Previous and Next over the pages the cache
  holds). `createPagination(list, { mode })` is the headless part for lists
  with markup of their own.
- It owns the states: the first page as skeletons, a failed first page as
  `LoadError` in place of the list, a failed next page under the items that
  stay, and the empty text.
- It owns focus and announcements: after Show more the focus goes to the
  first new item (`paginatedItem` marks items), after a page change to the
  first item of the page, and a live region says what loaded.
- A change to one item uses `patchItem` or `removeItem`; a new item uses
  `refreshHead` or `appendItem`. A list is not invalidated for one item.

## Alternatives considered

- **Keep the parts in each page**: the three lists had already drifted, and
  focus after loading was missing in all of them.
- **Numbered pages with a total**: the cursor API has no total; the `pages`
  mode works over the cached pages instead.
- **Infinite scroll only**: bad for the keyboard and for reaching the
  footer; `auto` stays an option of `more`.

## Consequences

- Every new paged list gets the states, focus and live region for free,
  and a page does not write "Show more", `LoadError` or the empty text.
- The remaining lists (sessions, notes, notifications, API clients,
  webhooks, schedules) still have to move to it, some with a client source
  for lists that are already whole in the cache.
- The rules are in `docs/contributing/data.md`.
