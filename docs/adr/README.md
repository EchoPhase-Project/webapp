# Architecture decision records

Each file here records one decision about the webapp: the situation, what
we chose, what we gave up, and what follows from it. The rules themselves
live in [docs/contributing/](../contributing/); a record explains _why_ a
rule is the way it is, so that the reasoning is not lost and the decision is
not argued again from scratch.

Records are numbered in order and never renumbered. A decision that is
replaced is not deleted: its status changes to "Superseded by NNNN", and the
new record links back to it.

To add one, copy [template.md](template.md) to the next number, for example
`0010-short-title.md`, and add it to the list below. Write in plain, clear
English.

| No.                                      | Decision                                                                  | Status   |
| ---------------------------------------- | ------------------------------------------------------------------------- | -------- |
| [0001](0001-query-without-suspense.md)   | TanStack Query without `<Suspense>`; `lazyPage` and skeletons for loading | Accepted |
| [0002](0002-page-widths-by-type.md)      | Page widths by page type                                                  | Accepted |
| [0003](0003-link-button.md)              | `LinkButton` beside `Button`, not a polymorphic button                    | Accepted |
| [0004](0004-card-grid.md)                | One `CardGrid` for grids of cards; `Masonry` for uneven heights           | Accepted |
| [0005](0005-playground-in-app.md)        | The component playground inside the app, no Storybook                     | Accepted |
| [0006](0006-sign-in-pages.md)            | Two sign-in routes in the common layout; sign-in only in the bar          | Accepted |
| [0007](0007-focus-ring-keyboard-only.md) | Field focus ring only when the keyboard moved the focus                   | Accepted |
| [0008](0008-skeleton-prop.md)            | `skeleton={false}` instead of a `loading` prop                            | Accepted |
| [0009](0009-translations-in-branch.md)   | When a branch may add translations instead of Weblate                     | Accepted |
