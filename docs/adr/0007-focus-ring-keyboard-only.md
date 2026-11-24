# 0007. Field focus ring only when the keyboard moved the focus

- Status: Accepted
- Date: 2026-11-24

## Context

Buttons and links already showed their focus ring only for keyboard use,
through `:focus-visible`. Text fields did not: browsers treat a text field
as `:focus-visible` after a mouse click too, because it is about to take
typing. Clicking a field drew the ring, which was not wanted.

## Decision

`watchFocusModality()` (in `shared/lib/focus-modality.ts`, started once in
`main.tsx`) records on `<html>` how the focus arrived:
`data-focus-by="keyboard"` or `"pointer"`. The value is taken when the
focus moves, not on every key, so typing into a field that was clicked does
not bring the ring. The shared `input-frame` mixin draws the ring unless the
pointer brought the focus. Before the script runs, the ring shows.

## Alternatives considered

- CSS only (`:focus-visible`): cannot tell the two cases apart for text
  fields.
- Switching on every keydown (as some polyfills do): typing after a click
  would turn the ring on.
- No ring on fields at all: fails keyboard users.

## Consequences

- One small global listener.
- Focus moved by code (to the first error after a submit) follows how the
  action started: Enter shows the ring, a mouse click does not.
