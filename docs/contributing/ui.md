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
