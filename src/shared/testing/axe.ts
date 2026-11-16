import axe from 'axe-core';
import { expect } from 'vitest';

// Rules that cannot work in jsdom. jsdom does no layout and paints nothing,
// so axe cannot see which colour is behind a text (palette.test.ts checks
// the contrast of the colour tokens instead).
const OFF_IN_JSDOM: axe.RuleObject = {
    'color-contrast': { enabled: false },
    'color-contrast-enhanced': { enabled: false },
};

/**
 * Runs axe on what a test rendered (a component's container, or
 * document.body for a page and its dialogs) and fails with each rule that
 * is broken and the elements that break it. Await it: axe is async, and
 * only one run may go at a time.
 *
 * A container only, not a full page: axe's page rules (one main landmark,
 * one h1, content in landmarks) are off unless `page` is true.
 */
export async function expectNoA11yViolations(
    context: Element | Document = document.body,
    options: { page?: boolean } = {}
): Promise<void> {
    const pageRules: axe.RuleObject = options.page
        ? {}
        : {
              region: { enabled: false },
              'landmark-one-main': { enabled: false },
              'page-has-heading-one': { enabled: false },
          };
    const result = await axe.run(context, {
        rules: { ...OFF_IN_JSDOM, ...pageRules },
        resultTypes: ['violations'],
    });
    const found = result.violations.map(
        (v) =>
            `${v.id} (${v.impact ?? 'unknown'}): ${v.help}\n` +
            v.nodes.map((n) => `  ${n.html}`).join('\n')
    );
    expect(found, found.join('\n\n')).toEqual([]);
}
