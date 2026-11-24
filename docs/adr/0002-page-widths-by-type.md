# 0002. Page widths by page type

- Status: Accepted
- Date: 2026-11-23

## Context

Every page had one `max-width` of 85em (about 1290 px). On a 1920 px screen
that left about 290 px empty on each side, and on ultra-wide screens over
1000 px. Lists, tables and grids could have shown much more; text pages, on
the other hand, already needed a narrower measure to stay readable.

## Decision

Three widths, chosen by the kind of page: `text` (72rem, a document with
its table of contents), `default` (1440 px) and `wide` (2400 px, lists,
tables, grids). The width comes from the `skeleton` option that each page
already gives `lazyPage`, through one map (`PAGE_WIDTHS`), so there is no
second list to keep in step. A page can override it with the `width`
option; sessions and API clients do, because their tables have few columns.
The side gutters grow with the window, `clamp(16px, 3vw, 64px)`.

## Alternatives considered

- One width for everything (as most Bootstrap or Tailwind admin apps):
  simple, but wastes wide screens for lists and stretches text and forms.
- Left-aligning all pages instead of centring them, so the left edge never
  moves between pages: considered when the home page jumped against the
  package list; we fixed that case by making home `wide` instead.
- A width per page: flexible, but no rule, and every page would drift.

## Consequences

- Pages must not set their own `max-width`.
- Moving between page types moves the left edge of the content. This is
  common (GitHub, Vercel, Stripe do the same) and accepted.
- Future: side navigation on wide text pages, extra table columns on wide
  screens, two-pane layouts (in the todo list).
