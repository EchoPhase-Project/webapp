# 0004. One `CardGrid` for grids of cards; `Masonry` for uneven heights

- Status: Accepted
- Date: 2026-11-24

## Context

The same `repeat(auto-fill, minmax(…, 1fr))` rule was written by hand in six
stylesheets with four different minimum widths (14, 16, 17 and 20rem), and
one used `auto-fit`, so cards on different pages had different sizes and
behaviour. The packages page had just become a grid as well.

## Decision

A shared `CardGrid`: columns of at least `size` (`small` 16rem, `medium`
20rem), as many as fit, rows of equal height, one column on a phone.
`stretch` lets a few cards fill the row (a brand page); otherwise
`auto-fill` keeps their width, so a short list looks like a long one. Its
loading form is a grid of empty cards. `Masonry` stays for cards of very
different heights.

It is called `CardGrid`, not `Grid`, on purpose: `Grid` would invite every
page and form layout to go through it and grow into CSS written as props.
This component does one thing.

## Alternatives considered

- Flex-wrap: each row is laid out on its own, so the last row stretches and
  columns do not line up. Good for rows of content-sized items (buttons,
  tags, `InlineList`), not for grids.
- A general `Grid` component with columns, rows and gaps as props: see
  above.
- `TileGrid`: neutral about the content, but every current use is cards.

## Consequences

- A structure test allows `repeat(auto-fill/auto-fit` only in `CardGrid`
  and `Masonry` (the dev playground is exempt).
- New grids of cards get the same widths and loading form for free.
