# 0012. Forms on `createForm`, without a form or validation library

- Status: Accepted
- Date: 2026-11-22

## Context

Every form wired its fields by hand on top of `createSubmit`: a signal per
field, an input handler, the errors of the field, the busy state, and the
copy of saved values into the fields. A survey of the 16 forms (2026-11-17)
also found five real bugs of that wiring: settings cards that overwrote
unsaved edits with saved values, three forms that did not show an error (a
failed edit in a modal, an error not about a field, a field error never
shown), and a confirm dialog that closed on failure.

The server is the authority on validation: DataAnnotations, `IValidatable`
and service errors arrive with the field name, and `groupErrors` already
puts them on the form. The client had only four checks, none of them a
schema rule (two comparisons, a JSON parse, normalised tags).

## Decision

- `createForm` on top of `createSubmit`: bindings spread on the controls
  (`form.input`, `form.control`, `form.toggle`), saved values given as
  `initial` (an untouched field follows them), `form.summary` for
  `ErrorSummary`, `form.onSubmit`, and `form.mutation(describe)`.
- A check in the browser goes in the `check(values)` option. No schema or
  validation library.
- `createConfirm` for confirm dialogs (it closes only after a success) and
  `QueryState` for the states of a read come from the same study.

## Alternatives considered

- **A schema library** (zod, valibot): it would duplicate the server's
  rules and drift from them, add 10–60 kB, and give a second error path
  beside `groupErrors`.
- **TanStack Form**: the closest to the stack, but it brings its own field
  API, validators and submit state, which would sit beside `createSubmit`
  rather than on it. Too much for 16 small forms.
- **Keep the hand wiring**: the bugs above came from it.

## Consequences

- Forms shrank by 15–37 % (ProfileForm 119 → 79 lines), and a wrong field
  name is a compile error.
- A form in a `Modal` saves with its own `form.mutation`; fields that come
  from data keep one record field (`InstallModal.tsx`).
- If the contract starts to carry `maxLength` or `pattern`, a generated map
  can fill them on the bindings; that still needs no library.
- The rules are in `docs/contributing/forms.md`.
