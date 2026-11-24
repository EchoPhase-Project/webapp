# Layout and folders

This file tells where the code goes, how the folders of the components look,
and how the frame of the app and the widths of the pages work.

[Back to CONTRIBUTING.md](../../CONTRIBUTING.md)

Contents:

- [Folders](#folders)
- [Folders of the components](#folders-of-the-components)
- [The frame and the page widths](#the-frame-and-the-page-widths)

## Folders

| Folder                 | Contents                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`             | Entry (`main.tsx`), `Root` (head), `Layout`, the page registry (`pages.ts`), routes and providers (`Router.tsx`), navigation; the header, footer, and brand tile in folders |
| `src/features/<name>/` | One feature in each folder: its page, components, API calls, styles, and tests                                                                                              |
| `src/shared/`          | The code that features share: `api/`, `consent/`, `i18n/`, `ui/`, `nav/`, `theme/`, `lib/`, `styles/`, `meta/`, `testing/`                                                  |
| `src/dev/`             | Pages to try shared components (dev server and `VITE_DEV_TOOLS` builds only)                                                                                                |
| `src/static/`          | Fonts, icons, and translations (`locales/`)                                                                                                                                 |

Import through the aliases (`@app/…`, `@features/…`, `@shared/…`, `@dev/…`,
`@static/…`). Do not use `../`. ESLint enforces these limits:

- `shared` imports only `shared`.
- A feature imports `shared` and its own files. It does not import a
  different feature. If two features need the same code, move that code to
  `src/shared/`.
- `dev` pages try only shared code.
- `app` can import all code, because it connects the features.

Put a shared helper in `src/shared/lib/` only if the helper has no domain.
If a helper belongs to a domain, put it in the folder of that domain. For
example, `paged-list.ts` is in `api/`, the consent code is in `consent/`, and
the avatar gradient is in `ui/Avatar/`. Thus, the code of a domain stays in
one folder, and `lib/` does not collect unrelated code.

In a feature, `XPage.tsx` only assembles the page: title, header, layout. Put
the parts of the page in `components/` and the API calls in `api.ts` (or
`api/<entity>.ts`, refer to [Data and the API](data.md)). Put
logic that must have tests in plain modules, with the tests adjacent to them
(`sessions/user-agent.ts` and `user-agent.test.ts`). A feature has one
stylesheet, `<feature>.scss`.

## Folders of the components

- If a component has its own stylesheet, give it a folder with its name.
  For example, `src/shared/ui/Modal/` contains `Modal.tsx`, `modal.scss`,
  `Modal.test.tsx`, and `index.ts`. Thus, a component and its style and
  tests are in one location.
- This rule applies to the components in `src/shared/ui` and to the parts of
  the app in `src/app`. Thus, the header, the footer, and the brand tile are
  in `src/app/Header/`, `src/app/Footer/`, and `src/app/BrandTile/`.
- The skeleton files of the app stay flat in `src/app/`: `main.tsx`,
  `Root.tsx`, `Router.tsx`, `Layout.tsx`, `pages.ts`, `nav-links.ts`,
  `NotFound.tsx`, and their tests. They do not have their own stylesheets.
- `index.ts` exports the default export and the named exports of the
  component. Thus, the import is `@shared/ui/Modal`, not
  `@shared/ui/Modal/Modal`.
- If only one component uses a helper component, put the helper in the
  folder of that component. For example, `LanguageSelect.tsx` is in
  `src/app/Header/`. Thus, the folder holds all the parts of the component.
- If some components use one stylesheet, put them in a family folder with
  the stylesheet. The form controls and `forms.scss` are in
  `src/shared/ui/forms/`. Import them as `@shared/ui/forms/Field`.
- A family folder does not have `index.ts` or a folder for each component.
  Each component in it is a file with its test adjacent to it.
- `icons.ts` stays at the root of `src/shared/ui`.
- If only the app uses a component, put it in `src/app/`. Thus,
  `src/shared/ui` contains only components that features can use.

## The frame and the page widths

- The frame of the app is an L. The bar (`Header`) goes across the top and
  holds the logo, which is the link to Home. On desktop, the rail goes under
  the bar.
  On desktop, the bar stays at the top. The page starts at the right of the
  rail.
  The sizes of the frame are the tokens `--header-height` and
  `--nav-collapsed`. Use these tokens for an offset. Do not write the values.
  The offsets then stay correct if the frame changes.
- A page gets its maximum width from its type. Do not set `max-width` on a
  page. The `skeleton` option of `lazyPage` gives the type (`PAGE_WIDTHS`):
  `document` is `text`, `table`, `cards`, and `list` are `wide`, and the
  other forms are `default`. The tokens are `--page-text`, `--page-default`,
  and `--page-wide`. Thus, lists and grids use a large screen, and text
  stays easy to read.
- If a table has few columns, give `lazyPage` the `width: 'default'`
  option. Sessions and API clients use this option. A wide table with few
  columns only makes the cells longer.
- For the space at the sides of a page, use `--page-gutter`. This value
  increases with the window, from 16px to 64px.
- If an element on a page is sticky, set `top` below the bar:
  `calc(var(--header-height) + 16px)` on desktop. If you do not do this, the
  bar covers the element.
- The tab order is the skip link, the logo, the buttons of the bar, the
  rail, and then the page. Keep this order in `Layout.tsx`.
