# Forms and changes

This file tells how to build a form, how a change goes to the server, and how
an action shows its errors.

[Back to CONTRIBUTING.md](../../CONTRIBUTING.md)

- To build a form, use `createForm` from `@shared/ui/forms/form`. Spread its
  bindings on the controls. Thus, each field is one line, and the ids, the
  values, the errors, and `disabled` are the same in all forms.
- Use `form.input(name)` for `Field` and `TextArea`. Use
  `form.control(name)` for `Select`, `RadioGroup`, `TimeZoneField`,
  `MarkdownEditor`, and `Combobox`. Use `form.toggle(name)` for `Checkbox`
  and `Switch`. The id of a field is `<id>-<name>`. The field names come
  from `initial`, and TypeScript refuses a name that is not there.
- Do not destructure a binding. Do not copy it into a new object. Its props
  are getters, and a spread keeps them. A copy does not change when the
  form changes.
- Do not make one signal for each field. The form keeps the values in one
  store.
- Give the saved values to `initial`, for example
  `() => ({ name: props.user.name })`. Do not copy them with `createEffect` or
  `createMemo`. If the saved values change, a field that the user did not
  change takes the new value. A changed field keeps the value of the user.
  Thus, a save in a different card does not remove an edit.
- Put `<ErrorSummary {...form.summary} />` at the top of the form. The
  summary sorts the errors in the order of the fields. Thus, the focus goes
  to the first field with an error on the page.
- Write the submit with `form.onSubmit(send)`. In `send`, call `run` of
  `form.mutation(describe)` and return its result. `onSubmit` stops the
  native submit and does nothing while the form is busy. Thus, a form does
  not send two times.
- Put a check in the browser in the `check` option. It returns a message
  for each field that is not correct. The messages show as the errors of
  the server do, and nothing goes to the server. Do not add a validation
  library. The server validates all data, and a second set of rules would
  not agree with it.
- A form in a `Modal` saves with its own `form.mutation`. Do not give it
  the `busy` or the `errors` of the parent. Thus, a failed save shows in
  the modal, and the modal stays open.
- If the fields come from the data (for example, one `Select` for each
  connection), keep one field with a record of the values. Then use only
  `onSubmit`, `summary`, and `busy`. A binding needs a field name that
  `initial` knows when the form starts. Refer to `InstallModal.tsx`.
- If the server uses a different name for a field, give the names in
  `serverFields`, for example `{ password: 'newPassword' }`. The errors of
  the server then show under the correct field.
- Use `form.dirty()` or `form.filled()` to disable the save button. Use
  `form.changed()` to send only the changed fields. After a save,
  `form.done()` is true until the next edit. Show it in a `role="status"`
  line. To clear the form, call `form.reset()` in `onOk`.
- `createForm` uses `createSubmit(fields)` from `@shared/api/submit`, and
  gives its `mutation`, `busy`, `errors`, and `setErrors`. If an action has
  no form and no dialog (a remove button), use `createSubmit()` directly. Give
  each mutation description to `submit.mutation(describe)`. Its
  `run(vars, onOk)` sets `busy`, runs the mutation, and groups the errors.
  The save code is then the same in all forms and actions.
- Put the cache changes (`setQueryData`, `invalidateQueries`,
  `removeQueries`) in the `onSuccess` of the description. A mutation then
  changes the cache in the same way from each page that uses it.
- Put only the steps of the form (close a dialog, go to a page) in `onOk`.
  `onOk` runs after `onSuccess`.
- If `onSuccess` returns the promise of a new fetch, `busy` stays true until
  the fetch is complete. Thus, the form does not show old data.
- The page shows each error below its field (`groupErrors`). It shows the
  other errors at the top of the form. The text of an error comes from its
  code: `errors.<code>` in the locale files. The message from the server is
  the fallback.
- If one error needs a special display, give `run` an `onFail` function. If
  `onFail` returns a value, the form shows that value. Refer to the "unchanged"
  conflict in `PublishModal.tsx`. This keeps the special case adjacent to the
  call.
- Each action shows its errors. Do not ignore a failed result. If the user
  does not see the failure, the user thinks that the action was successful.
- If an action has a `ConfirmDialog`, use `createConfirm(describe, vars,
onOk)` from `@shared/ui/ConfirmDialog`. Open the dialog with `ask(item)`,
  and spread `dialog` on the `ConfirmDialog`. Thus, the page does not write
  an item signal, a cancel function, or `setErrors({})`.
- `createConfirm` closes the dialog only after a success. A failure stays in
  the dialog, and the user can try again or cancel. Cancel and the next
  `ask` clear the errors. Thus, no dialog closes on a failure.
- Put the page steps (go to a page) in `onOk` of `createConfirm`. `onOk`
  runs after the dialog closes. Refer to `PackageSettings.tsx`.
- If the action has no dialog, put an `ErrorSummary` adjacent to the action
  or above the list. Refer to `SessionsPage.tsx`.
- `pending(work)` only sets `busy`. If you use it, show the errors with
  `setErrors`.
- If each row of a list saves on its own, use `createSubmit()` and
  `runFor(key, vars, onOk)` with the ID of the row as the key. Do not use
  `createForm` for these rows. One `createForm` is for one form. `busy(key)`
  and `errors(key)` then apply only to that row. `busy()` is true if a save is in progress. Thus, one row that
  saves or fails does not stop the other rows. Refer to
  `PackageWorkflowList.tsx`.
