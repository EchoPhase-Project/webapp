# 0015. The Popover API for non-modal panels, with a fallback

- Status: Accepted
- Date: 2026-11-16 (fallback kept 2026-11-24)

## Context

The notifications panel, the rail's flyouts and the `Combobox` list each
positioned themselves and closed on an outside click in their own way
(`createDismiss`, a close on resize, a stacking `z-index`). Such panels can
be clipped by an ancestor with `overflow` or covered by a later stacking
context.

## Decision

- A non-modal panel opens with `Popover` (or `createPopover` for a control
  with its own panel). It uses the HTML Popover API: the top layer, light
  dismiss, `toggle` events. `placement.ts` positions it (fixed coordinates,
  opening upwards when there is no room, kept inside the window, updated on
  scroll and resize).
- The trigger belongs to the caller: it changes `open` and sets
  `aria-expanded` and `aria-controls`; `Popover` calls `onClose`.
- A modal stays `Modal`, a `<dialog>` opened with `showModal()`, which gives
  what a popover does not: an inert page, focus kept inside, the modal role.
- Without the Popover API, `createPopover` falls back to its own light
  dismiss and stacking; the fallback and its tests stay.

## Alternatives considered

- **Keep each panel's own code**: three ways to do the same thing, each
  open to clipping.
- **Drop the fallback**: the API is Baseline since 2024 (Chrome 114,
  Firefox 125, Safari 17). The user chose to keep it because that is only
  about three years of support in all browsers.
- **CSS anchor positioning instead of `placement.ts`**: not in every
  browser yet; it may replace `placement.ts` later.

## Consequences

- Panels are never clipped by a container, and Escape returns the focus to
  the trigger.
- A press on the trigger of an open panel does not reopen it (a guard in
  `createPopover`); `showPopover({ source })` may make the guard
  unnecessary where browsers support it.
- `createDismiss` stays for panels that `Popover` does not open.
- The rules are in `docs/contributing/ui.md`.
