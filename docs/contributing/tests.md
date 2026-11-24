# Tests

This file tells how to write the tests and the tools that they use.

[Back to CONTRIBUTING.md](../../CONTRIBUTING.md)

The tests use Vitest. They are adjacent to the code (`*.test.ts`,
`*.test.tsx`). Tests run in Node. A component test starts with
`// @vitest-environment jsdom`. `src/shared/testing` contains the tools for
page tests: `fakeApi()` answers API calls and records them. `renderPage()`
renders a page with its providers.

The test setup loads the English strings before each component test file.
Thus, a page in a test shows the text from `en.json`, as in the app. If the
strings loaded during a test, the result of the test would change with the
load time.

Each component test includes the axe check:
`await expectNoA11yViolations()` from `src/shared/testing/axe.ts`. The check
finds controls without names, fields without labels, and incorrect ARIA.
The check does not examine colour contrast. jsdom does not paint, and
`palette.test.ts` examines the contrast of the tokens.

```sh
mise run test             # Vitest gets the extra arguments
mise run test:coverage    # artifacts/coverage
```
