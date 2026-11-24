# A new page

This file tells the steps to add a page: the feature folder, the parts of
the page, the entry in the registry, and the checks.

[Back to CONTRIBUTING.md](../../CONTRIBUTING.md)

Contents:

- [The registry](#the-registry)
- [The feature folder and the page](#the-feature-folder-and-the-page)
- [Rules](#rules)
- [Check](#check)

## The registry

All pages are in the registry `PAGES` in `src/app/pages.ts`. `Router.tsx`
makes the routes from it, and `nav-links.ts` makes the sidebar from it. Do not
add routes or sidebar links directly.

1. Make a feature folder with the page. Refer to
   [The feature folder and the page](#the-feature-folder-and-the-page).
2. Add an entry to `PAGES`:
    - `path` and `component`, with
      `lazyPage(() => import('@features/<name>/XPage'))`. Do not use `lazy`.
      `lazyPage` tells the layout that the page code is on its way. Thus, the
      layout announces the load and moves the focus when the page is ready.
    - The `skeleton` option of `lazyPage`: the shape that the page shows
      while its code loads, for example
      `lazyPage(() => import('…'), { skeleton: 'table' })`. Select the form
      that agrees with the content of the page: `table`, `cards`, `list`,
      `settings`, `detail`, or `document`. The default is `header`. The
      shape comes after 200 ms. Thus, a fast load shows nothing, and a slow
      load does not show an empty page. The form also sets the width of
      the page.
    - `auth: true` if the page needs a session.
    - `nav` if the page shows in the sidebar: an icon, an i18n key with its
      English text, and a `group` if the page is in a sub-menu.
    - `public: true` if search engines must find the page.
3. If the page is not in the sidebar, add a link to it in the footer
   (`src/app/Footer/Footer.tsx`) or on another page.
4. If the page has parts, give each part its own address. Use an optional
   route parameter, for example `/packages/:id/:section?`. Do not use
   `?tab=`. Then give the page its own group in the sidebar. Refer to
   [A page with its own group](layout.md#a-page-with-its-own-group).
5. Put the strings of the page in a `<page>.en.json` namespace. Refer to
   [i18n.md](i18n.md).
6. For a public page, add an `Allow:` line in `public/robots.txt`. The file is
   an allowlist: a page is private until it is in the list. `pages.test.ts`
   fails if `robots.txt` and the `public` pages are different.

## The feature folder and the page

1. Make the feature folder `src/features/<name>/`:
    - `XPage.tsx`. This file only assembles the page: title, header,
      layout.
    - `components/` for the parts of the page.
    - `api.ts` for the API calls. If the feature has more than one entity,
      use one `api/<entity>.ts` for each entity.
    - `<name>.scss`. This is the only stylesheet of the feature.
    - Tests adjacent to the code.
2. In the API file, write the TanStack Query descriptions. Refer to
   [The API layer of a feature](data.md#the-api-layer-of-a-feature).
3. In the components, use only these descriptions:
    - For a read, use `useQuery(() => xQuery())`. Show its states with
      `QueryState`. Refer to [Reads](data.md#reads).
    - For a list in pages, use `createPagedList(() => xInfiniteQuery())`,
      and show it with `Paginated`. Refer to `FilesPage.tsx` and
      `RunList.tsx`.
    - For a form, use `createForm`. For an action with a `ConfirmDialog`,
      use `createConfirm`. For an action without a form and without a
      dialog, use `createSubmit()`. Refer to [forms.md](forms.md).
4. Start the page with `PageHeader` in `XPage.tsx`.
5. To show that data loads, give `QueryState` a `placeholder` (`[]` for a
   list). Keep a static `PageHeader` outside `QueryState`. Refer to
   `src/features/sessions/SessionsPage.tsx`.
6. Set the title and the description with
   `usePageMeta(() => ({ title, description }))`. Do not add
   " · EchoPhase".
7. Put the content of the page in an element with the `page-stack` class.

## Rules

- Import through the aliases. Do not use `../`.
- A feature must not import another feature. Move shared code to
  `src/shared/`.
- Use the components in `src/shared/ui` before you write new markup.
- To show an API time, use `useDateFormat()` from
  `@shared/lib/date-format`.
- To change or remove one item of a list, use `patchItem` or `removeItem`
  in the `onSuccess` of the mutation. Do not invalidate the list.
- Use only the colour tokens. Start each class name with the feature name.
- Do not destructure props.
- Do not put `createSignal` or `createStore` at the top of a feature
  module. Keep user data in Query or in a component. If a module must keep
  it, use `sessionScoped` from `@shared/api/session-provider`.

## Check

1. Add a page test. Start it with `// @vitest-environment jsdom`. Use
   `fakeApi()` and `renderPage()` from `@shared/testing`. Refer to
   [tests.md](tests.md).
2. Run `mise run check`.
3. Examine the page in the two themes and at the width of a phone.
