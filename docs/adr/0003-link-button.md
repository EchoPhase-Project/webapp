# 0003. `LinkButton` beside `Button`, not a polymorphic button

- Status: Accepted
- Date: 2026-11-24

## Context

Some navigation needs the look of a button ("Get started", "Sign up",
"Export"). Ten places had written `<A class="btn">` by hand. When the
header's Sign up link got its own styles, it ended up with a different
height and a hover that was invisible in the dark theme, because it no
longer shared the button's rules.

## Decision

A separate `LinkButton` component next to `Button`. Both take their classes
from one function, `buttonClass(variant)`. `LinkButton` is the router's
`<A>` with link props only: no `disabled`, no `busy`. A link to another
site gets an arrow and `rel="noopener noreferrer"` automatically. ESLint
forbids the `btn` class on `<A>` and `<a>`.

## Alternatives considered

- `Button` with an `href` prop that renders a link (MUI, Chakra): one
  component, but its props become a union where `disabled` and `href` must
  not mix, and `<Button href>` hides the fact that it navigates.
- An `as` prop (Kobalte): the most general, with the heaviest types, for
  only two cases.
- `asChild` / a Slot (shadcn): Solid has no ready Slot; we would have to
  build prop and ref merging ourselves.
- A different hover colour for links, to show that they navigate: links in
  app bars elsewhere do not do this, it only helps mouse users, and it
  would have to be applied everywhere to mean anything.

## Consequences

- One source for the look and hover of all buttons.
- Screen readers announce the right kind of control.
- The choice is a rule: `Button` for an action on the page, `LinkButton`
  for a move to a page, a download, or another site.
