# 0008. `skeleton={false}` instead of a `loading` prop

- Status: Accepted
- Date: 2026-11-24

## Context

Shared components show their loading form when they sit in a
`SkeletonScope` that is loading (see [0001](0001-query-without-suspense.md)).
`PageHeader hero` needed a patterned `Card` as its frame, but `Card` would
replace everything inside it with three grey lines, including the real
`h1` that `PageHeader` keeps in its own loading form. Other cases have the
same shape: a `Card` around a `Table` should show the table's bar rows, not
three lines instead of the table.

## Decision

Each component with a loading form accepts `SkeletonProps`
(`skeleton?: boolean`) and passes its props to `useSkeleton(props)`.
`skeleton={false}` turns off that component's own loading form only; the
components inside still see the scope and show theirs.

## Alternatives considered

- A `loading` prop on each component: the page would have to pass the state
  down by hand, and the scope's other jobs (inert, one live region) would
  not happen.
- A wrapper that turns the scope off for a whole subtree: also turns it off
  for the components inside, which is wrong for the `Card` and `Table`
  case.
- Using the `card patterned` classes instead of the `Card` component: works,
  but bypasses the component.

## Consequences

- One small, uniform opt-out across `Card`, `SettingsCard`, `Table`,
  `PageHeader` and `CardGrid`.
- A new component with a loading form must take `SkeletonProps`.
