# 0013. One icon set, Tabler, only through `icons.ts`

- Status: Accepted
- Date: 2026-11-14

## Context

The app drew icons from nine sets of `solid-icons` side by side: Ant
Design, Feather, BoxIcons, Bootstrap, Font Awesome, Ionicons, Octicons,
Tabler and Codicons. Line weight, corner radius and inner padding differed,
most visibly in the navigation and on the About page, and there was no one
catalogue to pick a new icon from.

## Decision

- All icons come from `src/shared/ui/icons.ts`, under Tabler names. Only
  that file imports an icon library; ESLint enforces it.
- The set is the official `@tabler/icons-solidjs`. `solid-icons` stays only
  for the few icons Tabler does not have.
- Icons take the size of the text around them (`1em`, set in
  `global.scss`), and are `aria-hidden` by default.

## Alternatives considered

- **Tabler from `solid-icons/tb`**: a snapshot that updates only with
  `solid-icons`, and without the `stroke` and `title` props.
- **Keep the mix**: no code cost, but the uneven look stays and every new
  icon starts a search across nine sets.

## Consequences

- A change of icon set touches `icons.ts`, one CSS rule and one ESLint
  line, not the places that use icons.
- New icons are picked from tabler.io and added to `icons.ts` first.
- The bundle got smaller, a side effect rather than the reason.
- An icon-only control gives its name to the control (`aria-label`), not
  to the icon.
