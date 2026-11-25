# 0011. Three list controls: native `Select`, `Combobox`, `Listbox`

- Status: Accepted
- Date: 2026-11-16

## Context

The only custom list control was `Dropdown`, used by the language picker.
It looked like an editable combobox but followed no WAI-ARIA pattern: the
button was a `div role="button"`, typed letters were caught on `window`,
the typed filter was hidden from screen readers, each option was its own
Tab stop with no arrow keys, and it had no tests. The time zone field
needed a long list with a search, and other screens needed a list that is
always visible.

## Decision

- Three kinds of choice, each on a WAI-ARIA pattern:
    - a usual choice in a form: the native `Select`;
    - a short choice with its own look and no text input: `Combobox`
      (select-only), for example the language picker;
    - a long list with a search: `Combobox editable`, for example
      `TimeZoneField`;
    - a list that is always visible, one or more choices: `Listbox`.
- The keyboard logic, option ids and type-ahead live once in
  `createOptionList`, shared by all of them. Matching typed text uses
  `matchOptions` from `shared/lib/text-match`.
- No other list control is written; `Dropdown` was removed.

## Alternatives considered

- **Fix `Dropdown`**: its structure was the problem (no input, global key
  capture, options as Tab stops); a fix would have been a rewrite.
- **Custom controls everywhere, including plain form choices**: the native
  `select` is accessible, works with every input method and costs nothing;
  a custom control is only worth it where the native one cannot do the job
  (a search, a custom look, a visible list).
- **A headless component library**: not evaluated at the time. Two
  controls and a shared core were small enough to own, and they had to fit
  the project's own `Popover`, form bindings and skeletons.

## Consequences

- Each control has tests for its keys and an axe check; a pass with a
  real screen reader is still open.
- Selecting the selected value again does not call `onChange` in either
  custom control.
- An editable `Combobox` needs the texts `resultsText`, `noResults` and
  `moreResults` from `ui.*` keys.
- The rules for choosing one are in `docs/contributing/ui.md`.
