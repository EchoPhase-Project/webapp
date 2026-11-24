# Forms and changes

This file tells how to build a form, how a change goes to the server, and how
an action shows its errors.

[Back to CONTRIBUTING.md](../../CONTRIBUTING.md)

Contents:

- [Forms and actions](#forms-and-actions)
- [A settings card](#a-settings-card)
- [A table with actions](#a-table-with-actions)

## Forms and actions

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

## A settings card

Each part of a settings page is one `SettingsCard` from
`@shared/ui/SettingsCard`. Do not make a `Card` with an `h2` for it.

### The parts of a card

- `title`: a short name. `badge`: an optional status next to the title.
- `description`: one line that tells what the setting is.
- `children`: the content, for example a `Select`, a `RadioGroup`, or a
  short summary.
- `hint`: the left side of the footer. Put a short note there, and a
  "Read more" link to the docs article.
- `actions`: the right side of the footer. Put the save button there.
- `onSubmit`: with this prop, the card is a form. The submit button saves.
- `danger`: use it only for an action that you cannot undo (delete).

### Procedure

1. If one card is large, make it a component in `components/<X>Editor.tsx`.
   Give it the entity as a prop: `props: { pkg: WorkflowPackage }`.
2. Make the form with `createForm` from `@shared/ui/forms/form`. Give the
   saved value to `initial`:
   `const form = createForm({ id: 'package', initial: () => ({ visibility: props.pkg.visibility }) });`.
   Do not copy the saved value with `createEffect` or `createMemo`. A save
   in a different card puts a new entity in the cache. Then a field that
   the user did not change takes the new value, and a changed field keeps
   the value of the user.
3. In the API file of the feature, use a mutation description that saves
   only a part. The variables are the entity as the page opened it and a
   patch: `{ pkg, patch }`. The body is the full entity, then the patch.
   Refer to `updatePackageMutation` and the private `inputOf` in
   `features/packages/api/packages.ts`.
4. Keep `inputOf` private in the API file. An API file exports only
   descriptions. `src/app/structure.test.ts` enforces this rule.
5. Put the cache changes in the `onSuccess` of the description.
6. In the component, write
   `const updating = form.mutation(updatePackageMutation);`.
7. Write the submit with `form.onSubmit`. The values are the patch:
   `const save = form.onSubmit((patch) => updating.run({ pkg: props.pkg, patch }));`.
   Give `save` to the `onSubmit` prop of the card.
8. Put `<ErrorSummary {...form.summary} />` at the top of the content.
   Spread the binding on the control: `form.control('<field>')` for a
   `Select`, a `RadioGroup` or a `Combobox`, `form.input('<field>')` for a
   `Field`, `form.toggle('<field>')` for a `Checkbox` or a `Switch`. The binding gives the id,
   the value, the errors, and `disabled`. Do not destructure it. If you
   must use a raw `<input>`, use `form.id(name)`, `form.errorsOf(name)` and
   `form.set(name, value)`. Set `aria-invalid` and
   `aria-describedby={errorId(id)}`, and add a `FieldError`.
   Keep a text that is not a value yet (a typed tag) in its own signal,
   not in the form. If the save must add it first, add it, then call the
   handler of `form.onSubmit`. Refer to `TagsEditor.tsx`.
9. Put a `Button type="submit" variant="ghost" busy={form.busy()}` in
   `actions`. Disable it with `disabled={!form.dirty()}`.
10. For the "Read more" link, write
    `<A class="page-more" href="/docs/<slug>">{t('ui.more', 'Read more')}</A>`.
    If the article does not exist, refer to [docs-articles.md](docs-articles.md).

### A delete card

1. Give the card `danger`. Put a `Button variant="danger-outline"` in
   `actions`. This button only opens a `ConfirmDialog`.
2. Make the delete with `createConfirm` from `@shared/ui/ConfirmDialog`:
   `createConfirm(deleteXMutation, (x: X) => x.id, () => navigate('/xs'))`.
   The button calls `removal.ask(props.x)`. Spread `{...removal.dialog}` on
   the `ConfirmDialog`.
3. `createConfirm` closes the dialog only after a success, then runs
   `onOk` (go to the list). A failure stays in the dialog. Cancel clears
   the errors. Refer to `PackageSettings.tsx`.

### Rules

- Each action shows its errors. Do not ignore a failed result.
- Send each string through `t()`. Use `ui.*` keys for common words.
- The `expectedStamp` in the body causes a conflict if a different save
  came first. Do not remove it from the body.

### Tests

1. If you add a mutation description, test it in the API test file. Make
   sure that the request body has the patch, the other fields, and
   `expectedStamp`. Refer to the "update" test in
   `features/packages/api/packages.test.ts`.
2. For the card, add a page test with `// @vitest-environment jsdom`. Use
   `fakeApi()` and `renderPage()`. Refer to `MyPackagePage.test.tsx`.

### Check

Run `mise run check`.

### Examples

- `src/features/profile/components/ProfileForm.tsx`: a form on
  `createForm` that sends only the changed fields.
- `src/features/packages/components/PackageSettings.tsx`: the cards of a
  package and the delete card.
- `src/features/packages/components/ErrorWorkflowEditor.tsx`: a `Select`
  card that sends `null` for an empty choice.
- `src/features/packages/components/VisibilityEditor.tsx`: a card with
  `badge`, `onSubmit`, and a `RadioGroup`.
- `src/features/packages/components/TagsEditor.tsx`: a card for a list,
  with a raw `<input>`, `form.set`, and `form.errorsOf`.
- `src/features/packages/MyPackagePage.test.tsx`: "keeps an unsaved choice
  in one card when another card saves" is the test for the cards.
- `src/shared/ui/SettingsCard/SettingsCard.tsx`: the props.

## A table with actions

Use `Table`, `Row`, and `Cell` from `@shared/ui/Table`.

### Procedure

1. Make `features/<name>/components/<X>Table.tsx`. Give it the data or the
   parent entity as a prop. Do not destructure props.
2. Write the column headers in a function. Call it in render:
    ```ts
    // Read in render: the namespace may arrive after the first one.
    const column = () => ({
        name: t('x.name', 'Name'),
        actions: t('ui.actions', 'Actions'),
    });
    ```
    Do not keep the headers in a constant. The page namespace loads late, and
    a constant keeps the English fallback.
3. Give `headers={Object.values(column())}` to `Table`. Give `column().x` to
   the `label` of each `Cell`. On a phone, the cell shows this label.
4. Give `Table` a `placeholder` for an empty list.
   Show the read of the list with `QueryState` and `placeholder={[]}`:
   `<QueryState query={x} placeholder={[]}>{(list) => <XTable items={list()} … />}</QueryState>`.
   The table then shows rows of bars while the read is pending. Refer to
   `ApiClientsPage.tsx`. If the list comes one page at a time, use
   `Paginated` and give each row `<Row props={paginatedItem}>`. Refer to
   `FilesPage.tsx` and `FilesTable.tsx`.
5. Put the row actions in the last cell, `props={{ class: 'actions' }}`:
    - Edit: `Button variant="icon"` with `IconPencil`. Give it `aria-label`
      and `title` with the same text.
    - Delete: `RemoveButton` with a `label` that names the item. It uses the
      `icon-danger` variant.
    - Disable the two buttons while the delete is busy
      (`deletion.busy()`).
6. Put the add button in the panel head, adjacent to the lead text:
   `Button variant="ghost"` with `IconPlus` and a text.
7. Keep one signal in the component: the item in edit. For a new item, put
   a marker (`'new'`) in it. The delete keeps its item in `createConfirm`.
8. Show the form in a `Modal` with `open={!!editing()}`. In the modal, use
   `<Show when={editing()}>{(item) => <XForm … />}</Show>`. The title tells
   "Add" or "Edit".
9. Ask before a delete with `createConfirm` from `@shared/ui/ConfirmDialog`:
    ```ts
    const deletion = createConfirm(deleteXMutation, (x: X) => x.id);
    ```
    Give `deletion.ask` to the `RemoveButton` (`onClick={() => deletion.ask(x)}`)
    and spread `{...deletion.dialog}` on the `ConfirmDialog`. Do not use
    `open={!!x()}` and `x()!`.
10. `createConfirm` gives the dialog its `busy` and `errors`. It closes the
    dialog only after a successful delete, and clears the errors on cancel
    and on the next `ask`. Do not write a cancel function or
    `setErrors({})`.
11. Make the form in the modal with `createForm` from
    `@shared/ui/forms/form`. Spread its bindings on the controls. Put
    `<ErrorSummary {...form.summary} />` at its top. The form then shows
    its errors at its top and under its fields. Refer to
    `ApiClientForm.tsx`. The form saves with its own `form.mutation`, also
    if a hook (`useProgramSave`) does the delete. Do not give the errors of
    the parent to the form. Give the form the entity and an `onSaved` that
    closes the modal. Refer to `ScheduleForm` in `ScheduleTable.tsx`.
12. If other actions (not the form, not the delete) can fail, show their
    errors in an `ErrorSummary` above the table. Hide it while the modal is
    open: the page behind a modal is inert, so the user cannot see it.

### Saves

- In the form, use `form.mutation(<verb><Entity>Mutation)` and
  `form.onSubmit(send)`. For the delete and the other actions without a
  form, use `createConfirm` (with a dialog) or `createSubmit()` and
  `mutation(<verb><Entity>Mutation)` (without a dialog) from the API file of
  the feature. Put the cache changes in the `onSuccess` of the description.
- To change or remove one item in a paged list, use `patchItem` or
  `removeItem`. Do not invalidate the list.
- If each row saves on its own, use `createSubmit()` and
  `runFor(row.id, vars, onOk)`. Then use `busy(row.id)` and
  `errors(row.id)` for that row. Do not use `createForm` for these rows.
- If many tables edit the same entity, put the delete in one hook that
  returns a `createConfirm`. Refer to `useProgramSave` in
  `features/packages/program-save.ts`. The forms use the same mutation
  description through `form.mutation`.

### Rules

- Do not write `<button>` or `<table>` markup directly. Use the shared
  components.
- Import icons from `@shared/ui/icons`.
- Send each string through `t()`. Use `ui.*` keys for common words
  (`ui.delete`, `ui.actions`).

### Tests

Add a component or page test with `// @vitest-environment jsdom`. Use
`fakeApi()` and `renderPage()`. Make sure that these steps work: add,
edit, delete with the dialog, and a failed delete that shows its error.
Also make sure that a failed save shows in the modal, and the modal stays
open. Refer to the webhook and schedule tests in `WorkflowDetails.test.tsx`.

### Check

Run `mise run check`.

### Examples

- `src/features/packages/components/ScheduleTable.tsx`: the add button,
  the `'new'` marker, and one modal for add and edit.
- `src/features/packages/components/WebhookTable.tsx`: more icon buttons
  in a row (show, copy).
- `src/features/packages/program-save.ts`: a hook for the delete (a
  `createConfirm` on `updateWorkflowMutation`).
- `src/features/api-clients/ApiClientsPage.tsx`: `QueryState` with a
  placeholder around the table, and a delete on `createConfirm`.
- `src/shared/ui/Table/Table.tsx`, `RemoveButton/RemoveButton.tsx`,
  `ConfirmDialog/ConfirmDialog.tsx`, `ConfirmDialog/confirm.ts`.
