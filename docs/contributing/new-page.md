# A new page

This file tells the steps to add a page.

[Back to CONTRIBUTING.md](../../CONTRIBUTING.md)

All pages are in the registry `PAGES` in `src/app/pages.ts`. `Router.tsx`
makes the routes from it, and `nav-links.ts` makes the sidebar from it. Do not
add routes or sidebar links directly.

1. Make a feature folder with the page.
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
4. Put the strings of the page in a `<page>.en.json` namespace.
5. For a public page, add an `Allow:` line in `public/robots.txt`. The file is
   an allowlist: a page is private until it is in the list. `pages.test.ts`
   fails if `robots.txt` and the `public` pages are different.
