# Styles

This file tells how to write the stylesheets: the colour tokens, the class
names, the mixins, the shared classes, and the grids.

[Back to CONTRIBUTING.md](../../CONTRIBUTING.md)

- Use only the colour tokens in `src/shared/styles/tokens.scss`. Each token
  has a value for the light theme and for the dark theme.
- `palette.test.ts` examines the contrast of the tokens (WCAG): text 7:1;
  muted text, links, and status colours 4.5:1; accents and focus 3:1. A new
  token must have values for the two themes and must pass this test.
- All stylesheets are global. The project does not use CSS modules. Start each
  class name with the name of the component or the feature (`.sessions-…`,
  `.consent-…`).
- Do not apply styles to bare elements (`p`, `h1`, `header`) outside
  `global.scss`.
- Each SCSS file gets the modules `vars`, `comp` (`@include comp.media(…)`),
  `prefixes`, and `mix` automatically (`vite.config.ts`). Do not import them.
- `mix` (`src/shared/styles/mixins.scss`) contains the rules that many
  components use. Before you copy a rule, examine this file.
  `@include mix.input-frame` gives the border, the focus ring, and the
  invalid ring of a field.
  The focus ring of a field shows only if the keyboard moved the focus to
  it. `watchFocusModality` in `shared/lib/focus-modality.ts` sets
  `data-focus-by` on `<html>`. A text field matches `:focus-visible` after
  a click too. Thus, CSS alone cannot make this difference.
  `@include mix.plain-list(6px)` removes the bullets and the indent of a
  list, and puts its items in a column.
- `global.scss` contains classes that many pages use. `actions-row` is a
  row of buttons, and `actions-row--end` moves it to the right. `badge` is
  a small label, for example a version. `pill pill--ok` (or `--bad`,
  `--busy`, `--quiet`) is a status word. Do not make a copy of these
  classes in a feature.
- For cards of one size side by side, use `CardGrid`. For cards of very
  different heights, use `Masonry`. Do not write `repeat(auto-fill, …)` in
  a stylesheet: `structure.test.ts` fails. Thus, all grids of cards have the
  same column widths and the same loading form.
- For short parts on one line with a dot between them, use `InlineList`.
  Do not write `' · '`. The component draws the dot at the centre of the
  line in all fonts, and screen readers hear a comma. A wrapped line does
  not start with a dot. Inside a translated string, keep the `·`
  character. Translators must not get markup.
- A brand page (About) starts with `<PageHeader hero>`. It has the same
  parts on a card with the pattern, larger, with the actions under the
  text. Do not write a hero of your own. Thus, the title, the skeleton, and
  the focus on the `h1` stay the same on all pages.
- Use the flowing-lines pattern (`.patterned`, `Card patterned`) only for
  brand areas: the sign-in card, empty states, the outage screen, the About
  page. Do not use it on tables, menus, or forms.
