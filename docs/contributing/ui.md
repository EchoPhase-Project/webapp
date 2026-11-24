# UI components

This file tells which shared component to use and how the controls, the
panels, the list controls, and the icons work.

[Back to CONTRIBUTING.md](../../CONTRIBUTING.md)

Contents:

- [The shared components](#the-shared-components)
- [Controls](#controls)
- [Panels](#panels)
- [List controls](#list-controls)
- [Icons](#icons)
- [Add a shared component](#add-a-shared-component)

## The shared components

Before you write new markup, make pages from the components in
`src/shared/ui`:

| Component                                             | Purpose                                                                                                                                                                                       |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LinkButton`                                          | A link with the look of a `Button` (the same `variant`): a move to a page, a download, another site. It has no `disabled` and no `busy`                                                       |
| `Button`                                              | Actions: `primary` (the main action), `ghost`, `icon` (delete, revoke), `danger` (the confirmed destructive action), `danger-outline` (opens that action), `link` (an action in a sentence)   |
| `HeaderButton`                                        | The square icon buttons in the top bar (new note, notifications, theme)                                                                                                                       |
| `Tabs`, `NavTabs`                                     | A line of tabs over one panel (Write and Preview), with the keyboard of the WAI-ARIA tabs pattern. `NavTabs` are links to the parts of a page                                                 |
| `Field`, `Select`, `FieldError`, `ErrorSummary`       | Form fields with their labels and errors, connected for screen readers                                                                                                                        |
| `Checkbox`, `RadioGroup`                              | Options in a form, as cards. The form sends them                                                                                                                                              |
| `Listbox`                                             | A list of options that is always visible, for one choice or more than one, with the keyboard of the WAI-ARIA listbox pattern                                                                  |
| `Combobox`                                            | A button that opens a list of options for one short choice (the language), with the keyboard of the WAI-ARIA select-only combobox pattern. With `editable`, an input that filters a long list |
| `TimeZoneField`                                       | A field for an IANA time zone: an editable `Combobox` with the zones of the browser. It accepts only a zone from the list                                                                     |
| `TextArea`, `MarkdownEditor`                          | Text of more than one line, with its label and errors. `MarkdownEditor` adds the Write and Preview tabs                                                                                       |
| `Modal`, `ConfirmDialog`                              | Dialogs (native `<dialog>`). Ask the user before an action that you cannot undo                                                                                                               |
| `Popover`                                             | A panel that is not modal, next to its trigger: a menu, a list, the notifications. It shows in the top layer of the browser. A click outside and Escape close it                              |
| `Card`, `EmptyState`, `Table`, `PageHeader`, `Switch` | Surfaces, lists, the start of a page, on/off settings that the app saves immediately                                                                                                          |
| `Masonry`                                             | Cards of different heights in columns, in the order of the list (the Explore cards)                                                                                                           |
| `SettingsCard`                                        | One part of a settings page: a title, a description, the content, and a footer with a hint and the action                                                                                     |
| `ShareList`                                           | The people that an item is shared with, and a username field to share it. The feature gives its API functions                                                                                 |
| `BackLink`                                            | The link back to the list or the package, above the `PageHeader` and above a "not found" message                                                                                              |
| `RemoveButton`                                        | The cross at the end of a row that removes the row (a file, a person, a tag). Its label tells what goes                                                                                       |
| `LoadError`                                           | The error of a read that failed, in place of the data, and a button to try again                                                                                                              |
| `QueryState`                                          | One read in its states: `LoadError` with a retry, the loading form (with a `placeholder`), the `empty` text, the `notFound` text, the data                                                    |
| `CardGrid`                                            | Cards of one size side by side, as many as fit: `size` `small` (16rem) or `medium` (20rem), `stretch`, `as="ul"`. Its loading form is a grid of empty cards                                   |
| `InlineList`                                          | Short parts on one line with a dot between them ("by Ann · 12 installs"). It omits empty parts. Screen readers hear a comma                                                                   |
| `Paginated`                                           | A list that comes one page at a time, with "Show more" (mode `more`) or "Previous" and "Next" (mode `pages`), its states, and the focus                                                       |
| `SkeletonScope`, `SkeletonText`, `SkeletonBlock`      | A part of a page whose data loads: the shared components in it show bars in the shape of their content. `SkeletonText` and `SkeletonBlock` are bars for markup of your own                    |
| `PageSkeleton`                                        | The rough shape of a page (`header`, `table`, `cards`, `list`, `settings`, `detail`, `document`). `lazyPage` shows it while the page code loads                                               |

Each shared component has a page in `src/dev/`. The page shows the variants
and the states of the component. If you add a shared component, show it on a
page in `src/dev/`. If you make a new page, add one entry for it to the list
in `src/dev/routes.ts`. Thus, a person can examine the component in the
browser without a real page that uses it. The list gives the path, the title,
and the line on the index. The test renders each page from the list.

## Controls

- Make buttons, tabs, checkboxes, radio buttons, selects, and text areas with
  the components in `src/shared/ui`. Do not write `<button>`, `<select>`,
  `<textarea>`, or `<input type="checkbox">` in a feature. These components
  have one look and one keyboard behaviour.
- ESLint (`no-restricted-syntax`) stops these elements outside
  `src/shared/ui` and `src/shared/nav`.
- If a link must look like a button, use `LinkButton`. Do not put the `btn`
  class on `<A>` or `<a>`. ESLint stops this class on a link. Thus, the
  look and the hover of a button have one source, `buttonClass`.
- Use `Button` for an action on the page. Use `LinkButton` for a move to a
  page, a download, or another site. A screen reader then tells the user
  the correct type of control.
- `LinkButton` adds an arrow (↗) and `rel="noopener noreferrer"` to a link
  to another site. With `target="_blank"`, screen readers also hear "opens
  in a new tab". Thus, the user knows before the click that the link leaves
  the app.
- If a full card or a full row opens an item, you can use `<button>`. Then
  write `eslint-disable-next-line no-restricted-syntax` with the reason on the
  line above it. A card is not an action button, and the `.btn` style does
  not apply to it.
- Use `Switch` for a setting that the app saves immediately. Use `Checkbox`
  for an option that a form sends. The two controls have different
  behaviour.
- If an action goes to a different page, use a link (`<A>`). Do not use
  `Button variant="link"` for it.
- A `ConfirmDialog` asks about one item. The dialog is open while `item`
  has a value. It gives the item to `onConfirm` and to the children
  function. Thus, the page does not need `open` or a `!` assertion.
- If the dialog is about the page (delete this package, revoke all
  sessions), give the entity or a word such as `'all'` as the item. Then all
  dialogs use the same form.
- If the action of a `ConfirmDialog` can fail, use `createConfirm`. It
  closes the dialog only after a success, and the dialog shows the errors.
  Thus, the user sees why the action failed and can try again.

## Panels

- A non-modal panel (a menu, a list, a notifications panel) opens with
  `Popover`. A modal opens with `Modal`.
- The browser puts a `Popover` in its top layer and closes it on a click
  outside and on Escape. A `Modal` makes the rest of the page inert and
  keeps the focus in the dialog.
- The trigger of a `Popover` belongs to the caller. The trigger changes
  `open` and sets `aria-expanded` and `aria-controls`.
- Give `onClose` to each `Popover`, and set `open` to false in it. The
  browser can close the panel, and `onClose` keeps the state of the trigger
  correct.
- Do not write a second `open` change for a click on the trigger.
  `Popover` makes sure that a click on the trigger of an open panel closes
  it.
- If a control must have its own panel, use `createPopover` from
  `@shared/ui/Popover`. `Combobox` uses it in the `manual` mode, because
  its keys close its list.

## List controls

Select the control for a choice from a list with these rules:

| The choice                                  | The control                                     | Example                        |
| ------------------------------------------- | ----------------------------------------------- | ------------------------------ |
| A usual choice in a form                    | The native `Select` (`@shared/ui/forms/Select`) | The fields of a form           |
| A short choice with its own look, no typing | `Combobox`                                      | `LanguageSelect` in the header |
| A long list with a search                   | `Combobox` with `editable`                      | `TimeZoneField`                |
| A list that is always visible               | `Listbox` (`multiple` for more than one)        | The page `/dev/listbox`        |

- Use the native `Select` for a usual choice in a form. A phone shows its
  own picker for it, and the app does not have to make one.
- Use `Combobox` only if the choice needs its own look, as in the header.
  The native `Select` is easier to use on a phone.
- Use an editable `Combobox` for a list that is too long to scroll. The user
  types some letters, and the list shows only the options that agree.
- Give an editable `Combobox` the texts `resultsText`, `noResults`, and
  `moreResults` from `ui.*` keys. The component has no text of its own, and
  each list uses the same words. Refer to `forms/TimeZoneField.tsx`.
- Do not write a list control of your own. Use `createOptionList` from
  `@shared/ui/Listbox` for a new control. It has the keys, the type-ahead,
  and the option ids that `Listbox` and `Combobox` use. Thus, all lists
  have one keyboard behaviour.
- To find options that agree with a typed text, use `matchOptions` from
  `@shared/lib/text-match`. Do not give it empty fields. An empty field is
  near each query of one or two letters, and then each option agrees.
- If the user selects the selected value again, `Listbox` and `Combobox` do
  not call `onChange`. Thus, the caller does not have to compare the values.
- `Field` and `TextArea` give the input event to `onInput`, as a native
  input does. All other controls give the new value to `onChange`:
  `MarkdownEditor`, `Select`, `TimeZoneField`, `Checkbox`, `RadioGroup`,
  `Listbox`, `Combobox`, `Switch`. Thus, one prop name always gets one type
  of argument.
- Give each form control the errors of its field with the `errors` prop:
  `Field`, `TextArea`, `MarkdownEditor`, `Select`, `TimeZoneField`,
  `Checkbox`, `RadioGroup`, `Switch`, `Combobox`. The control shows the errors under it and sets
  `aria-invalid` and `aria-describedby`. Thus, a screen reader reads the
  error with the control.

## Icons

- Import each icon from `@shared/ui/icons`. Do not import an icon library
  directly. ESLint stops a direct import.
- Only `src/shared/ui/icons.ts` imports the icon libraries. This file is the
  list of all icons in the app.
- Each export has the name of the icon in the Tabler catalogue
  (tabler.io/icons), for example `IconX` or `IconTrash`. Thus, a new icon
  has a known name.
- Use one icon for one meaning. Before you add an export, find an export with
  the same meaning in `icons.ts`.
- Take each icon from Tabler (`@tabler/icons-solidjs`). If Tabler does not
  have the icon, use `solid-icons`: first `fi` (Feather), then `si` for brand
  logos. Feather has the style that is nearest to Tabler.
- If you export an icon from `solid-icons`, write a comment in `icons.ts`. The
  comment tells which Tabler icons you examined.
- Each export goes through `decorative` in `icons.ts`. Thus, each icon has
  `aria-hidden="true"`, and a screen reader does not read it two times next
  to its text.
- Do not write `aria-hidden` on an icon. The icon has it already.
- The icon size is the font size of the text around the icon. The line width
  is in `global.scss` (`.tabler-icon`). Do not set `size` or `stroke` in JSX.

## Add a shared component

A shared component goes in `src/shared/ui/`. Features use it. It does not use features. The folders are in [Folders of the components](layout.md#folders-of-the-components).

### Procedure

1. Make sure that no component in `src/shared/ui` already does the work. The
   list is in `AGENTS.md`, in "UI and styles".
   If the component is a choice from a list, read [List controls](#list-controls) first.
2. If the component is a form field that uses `forms.scss`, make
   `src/shared/ui/forms/<Name>.tsx`. Then go to step 4.
3. Make the folder `src/shared/ui/<Name>/` and the file `<Name>.tsx` in it.
   Make `index.ts`: `export { default } from './<Name>';`. If the module
   also has named exports, add `export * from './<Name>';`.
4. Give the default export a `/** … */` comment that tells its purpose.
5. Type the props. Give each prop that is not clear a `/** … */` comment.
6. Do not destructure props. Read `props.x` in JSX. If the component sends
   the other props to an element, use `splitProps`:
   `const [own, rest] = splitProps(props, ['label', 'class']);`.
7. If the component wraps a native element, give it the native attributes
   (`JSX.ButtonHTMLAttributes<…>`). Add the `class` of the caller to your
   own class. Refer to `HeaderButton/HeaderButton.tsx`.
8. If the component has text, use `useI18n()` and a `ui.*` key in
   `src/static/locales/en.json`: `t('ui.try_again', 'Try again')`. Refer to
   `LoadError/LoadError.tsx`.
9. Make `<name>.scss` in kebab-case in the folder of the component. Import
   it in the component: `import './<name>.scss';`. A form field uses
   `forms/forms.scss` and its classes. Refer to `forms/Select.tsx`.
10. Start each class name with the component name (`.header-button`,
    `.settings-card-…`). Use only the colour tokens from
    `src/shared/styles/tokens.scss`. Do not import `vars`, `comp`, or `mix`.
    Vite adds them.
11. Import other shared components through the alias:
    `import Button from '@shared/ui/Button';`. Use `./` only for files in
    the same folder. ESLint does not let you use `../`.
12. Import icons only from `@shared/ui/icons`. These icons have
    `aria-hidden="true"` by default. Do not write `aria-hidden` on an icon.
    If the control shows only an icon, give the name to the control:
    `aria-label`, or a `label` prop as in `HeaderButton`.
13. If the component shows data, give it a loading form. Read
    `useSkeleton()` from `@shared/ui/Skeleton`. If it is true, keep the
    frame of the component and show `SkeletonText` or `SkeletonBlock` in
    place of the data. Keep a real heading element, with its text if the
    caller gave one. Hide the actions with `visibility: hidden`, so that
    the layout does not move. Do not add a `loading` prop: the scope makes
    the part inert and announces the load. Refer to `Table/Table.tsx` and
    `PageHeader/PageHeader.tsx`.
    If the component shows a list, let it take the attributes of its items
    (`Row` `props`, `Masonry` `itemProps`). Then `Paginated` can mark them
    with `paginatedItem` and move the focus to them.
    Do not write the states of a read (`LoadError`, the empty text) in a
    shared component. The caller wraps it in `QueryState` or `Paginated`.
14. If a feature must not write the bare element, add a selector to
    `ownControls` in `eslint.config.mjs`. The message names the new
    component. `src/shared/ui/**` and tests are exempt from the rule.
15. Add the component to the list in `AGENTS.md` ("UI and styles") and to
    the table in `docs/contributing/ui.md` ("The shared components").
    Write one line on its purpose.
16. Show the component on a page in `src/dev/`. If the component belongs
    to a family, add it to the page of the family (for example,
    `FormsPage.tsx` for a form field). If not, make `<Name>Page.tsx`.
17. If you made a new page, add one entry to the list in `devPages()` in
    `src/dev/routes.ts`: the path, the title, one line, and
    `lazy(() => import('./<Name>Page'))`. The index `/dev` and
    `src/dev/routes.test.tsx` then include the page.
18. On the page, show each variant and each state next to the others. Use
    `DevSection`, `DevGrid`, and `DevSample` from `src/dev/DevKit.tsx`.
    Write the demo text in English. Do not use i18n keys and real
    requests. Refer to `src/dev/ShareListPage.tsx` for fake query and
    mutation descriptions.
19. If a feature has a copy of the same markup, replace it with the new
    component.

### Rules

- The keyboard must get access to the control. The focus must be visible.
- A field has a label. Connect its errors with `errorId` from
  `forms/FieldError.tsx`.
- A form control accepts `errors` (`ErrorItem[]`). It shows a `FieldError`
  under it and sets `aria-invalid` and `aria-describedby`. Refer to
  `forms/Field.tsx` and `forms/RadioGroup.tsx`.
- `FieldError` needs the i18n context. If the control can show without
  `I18nProvider` (`Switch`, `Combobox`), make `FieldError` only when the
  control has errors: `<Show when={invalid()}>`.
- Only `Field` and `TextArea` give the event to `onInput`. A new control
  gives the value to `onChange`.
- A new form control must accept a binding of `createForm`
  (`@shared/ui/forms/form`): `id`, `name`, `value` or `checked`,
  `onChange`, `errors`, and `disabled`. Then a form spreads
  `form.control(name)` or `form.toggle(name)` on it. Do not destructure the
  props: the binding gives getters. Show the control with a binding in
  the "createForm" sample on `/dev/forms`.
- Do not use colour as the only signal of a state.
- If the component is a dialog, use `Modal`. If it is a non-modal panel, use
  `Popover`. If you cannot use `Modal`, give
  the dialog `aria-labelledby` on its title, or `aria-label`.
- If the component shows a temporary message, keep a live region on the
  page (`role="status"`, or `role="alert"` for errors). Change only its text.
- Each animation needs a `@media (prefers-reduced-motion: reduce)` block.
- `src/shared` imports only `src/shared`. ESLint enforces this rule.

### Tests

1. Make `<Name>.test.tsx` adjacent to the component. Start it with
   `// @vitest-environment jsdom`.
2. Render with `render` from `@solidjs/testing-library`. Find elements by
   role and name (`screen.getByRole('button', { name: … })`).
3. Examine the accessible name, the keyboard, and the events. Refer to
   `HeaderButton/HeaderButton.test.tsx`, `forms/Checkbox.test.tsx`, and
   `Tabs/Tabs.test.tsx`.
4. Add the axe check at the end of a test that renders the component:
   `await expectNoA11yViolations();` from `@shared/testing/axe`. If the
   component has more than one state (empty, an error, open, loading), do
   the check in each state. Test the loading form in a
   `<SkeletonScope when>`. Refer to `Table/Table.test.tsx`.
5. The test in `src/dev/routes.test.tsx` renders each page in `src/dev/`
   and does the axe check. Do not write a separate test for a dev page.

- In a test, jsdom has no Popover API. Stub `showPopover` and
  `hidePopover` on `HTMLElement.prototype`. To close the panel as the
  browser does, send a `toggle` event with `newState` "closed". Refer to
  `Popover/Popover.test.tsx`.

### Check

1. Run `mise run check`.
2. Examine the component on its page in `/dev`, in the two themes and at
   the width of a phone. If you cannot do this, tell the user.

### Examples

- `src/shared/ui/HeaderButton/`: `splitProps`, native attributes, its own
  `header-button.scss`, and an ESLint message that names it.
- `src/shared/ui/forms/Select.tsx` and `forms/Checkbox.tsx`: form controls
  with a label and errors. They use `forms/forms.scss`.
- `src/shared/ui/Tabs/`: the WAI-ARIA tabs keyboard, `tabs.scss`, and named
  exports in `index.ts`.
- `src/shared/ui/LoadError/`: a component with `ui.*` text.
- `src/shared/ui/Popover/`: a panel in the top layer (`Popover`), the hook
  `createPopover`, and the placement in `placement.ts`.
- `src/shared/ui/ConfirmDialog/`: a component and its helper
  (`createConfirm` in `confirm.ts`, built on `createSubmit`), both from
  `index.ts`.
- `src/shared/ui/QueryState/` and `src/shared/ui/Paginated/`: the states
  of a read on one base (`DataState`), the headless `createPagination`,
  and one page in `src/dev/` (`DataPage.tsx`) with fake queries.
- `src/shared/ui/Listbox/` and `src/shared/ui/Combobox/`: list controls on
  `option-list.ts` (`createOptionList`), with `aria-activedescendant`, named
  exports in `index.ts`, and a page in `src/dev/`.
