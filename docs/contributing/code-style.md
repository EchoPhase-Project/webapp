# Code style

This file tells the rules of the code: formatting, names, comments, and the
shared helpers.

[Back to CONTRIBUTING.md](../../CONTRIBUTING.md)

- TypeScript is strict. Prettier formats the code: 4 spaces (2 in SCSS and
  JSON), single quotes, 80 columns. Run `npm run format`.
- ESLint uses type information and the Solid rules. `solid/reactivity` causes
  an error. Read props as `props.x` in JSX or in effects. Use `splitProps`.
  Do not destructure props.
- Components and pages are files in PascalCase (`SessionsPage.tsx`). Modules,
  hooks, and providers are files in kebab-case (`user-agent.ts`,
  `session-provider.tsx`).
- Comments are full sentences. They tell why or for which purpose. They do
  not tell what the next line does. Exported functions and components have a
  `/** … */` comment.
- To show an API time, use `useDateFormat()` from `@shared/lib/date-format`.
  It shows the time in the time zone of the user and in the current language.
  Do not call `DateHelper.format` in a component.
- A page sets its title and description with `usePageMeta()` from
  `@shared/meta/page-meta`: `usePageMeta(() => ({ title, description }))`.
  Do not add " · EchoPhase" to the title. `usePageMeta` adds it.
- A page starts with `PageHeader`.
- Put the content of a page in an element with the `page-stack` class
  (`global.scss`). If a page needs more styles, add a feature class next to
  it. Do not write the same grid again in a feature stylesheet.
- Use the helpers in `src/shared/lib` before you write the same logic again:
    - `createDebounced(ms)`: a search that waits for a pause in typing.
    - `createDismiss(ref, isOpen, close)`: a popup that closes on a click
      outside and on Escape. Use it only for a panel that `Popover` does not
      close, for example the list of `Combobox`.
    - `createClipboard()`: a copy button with a "Copied" state
      (`ui.copied`).
    - `matchOptions(options, query, fields)` (`text-match.ts`): the options
      that agree with a typed text, also if the text has small errors.
- Put a developer aid (a page, a panel, or details for a developer) behind
  `import.meta.env.DEV_TOOLS`. Do not read `import.meta.env.DEV` directly.
  `DEV_TOOLS` is true in the dev server and in a build with
  `VITE_DEV_TOOLS=true`, for example the dev cluster. Thus, one switch
  controls all aids in a build. `vite.config.ts` replaces `DEV_TOOLS` with
  `true` or `false` in each module. Thus, Rollup removes the aids and their
  chunks from the usual build. Do not copy `DEV_TOOLS` to an exported
  constant, because then Rollup keeps the chunks. ESLint enforces the rule,
  and `mise run check` examines `dist/` for the aids.
