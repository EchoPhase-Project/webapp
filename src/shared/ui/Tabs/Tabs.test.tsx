// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createSignal } from 'solid-js';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { MemoryRouter, Route } from '@solidjs/router';
import { expectNoA11yViolations } from '@shared/testing/axe';
import Tabs, { NavTabs, tabPanelProps } from './Tabs';

type Tab = 'write' | 'preview' | 'help';

function renderTabs() {
    const [tab, setTab] = createSignal<Tab>('write');
    render(() => (
        <>
            <Tabs
                id="t"
                label="Text"
                value={tab()}
                onChange={setTab}
                tabs={[
                    { value: 'write', label: 'Write' },
                    { value: 'preview', label: 'Preview' },
                    { value: 'help', label: 'Help' },
                ]}
                aside="Markdown works"
            />
            <div {...tabPanelProps('t', tab())}>
                <textarea aria-label="Body" />
            </div>
        </>
    ));
    return tab;
}

const tabNamed = (name: string) => screen.getByRole('tab', { name });

describe('Tabs', () => {
    it('names the list, marks the selected tab and ties the panel to it', async () => {
        renderTabs();
        expect(screen.getByRole('tablist', { name: 'Text' })).toBeTruthy();
        expect(tabNamed('Write').getAttribute('aria-selected')).toBe('true');
        expect(tabNamed('Preview').getAttribute('aria-selected')).toBe('false');
        expect(screen.getByText('Markdown works')).toBeTruthy();

        const panel = screen.getByRole('tabpanel', { name: 'Write' });
        expect(tabNamed('Write').getAttribute('aria-controls')).toBe(panel.id);

        fireEvent.click(tabNamed('Preview'));
        expect(tabNamed('Preview').getAttribute('aria-selected')).toBe('true');
        expect(screen.getByRole('tabpanel', { name: 'Preview' })).toBe(panel);
        await expectNoA11yViolations();
    });

    it('keeps only the selected tab in the Tab order', () => {
        renderTabs();
        expect(tabNamed('Write').tabIndex).toBe(0);
        expect(tabNamed('Preview').tabIndex).toBe(-1);
        expect(tabNamed('Help').tabIndex).toBe(-1);
    });

    it('moves and selects with the arrows, Home and End, wrapping around', () => {
        const tab = renderTabs();
        const press = (key: string) =>
            fireEvent.keyDown(document.activeElement ?? document.body, {
                key,
            });
        tabNamed('Write').focus();

        press('ArrowRight');
        expect(tab()).toBe('preview');
        expect(document.activeElement).toBe(tabNamed('Preview'));
        expect(tabNamed('Preview').tabIndex).toBe(0);
        expect(tabNamed('Write').tabIndex).toBe(-1);

        press('End');
        expect(tab()).toBe('help');
        expect(document.activeElement).toBe(tabNamed('Help'));

        press('ArrowRight');
        expect(tab()).toBe('write');
        expect(document.activeElement).toBe(tabNamed('Write'));

        press('ArrowLeft');
        expect(tab()).toBe('help');

        press('Home');
        expect(tab()).toBe('write');
        expect(document.activeElement).toBe(tabNamed('Write'));

        // Other keys are the page's (Tab, Enter, letters).
        press('a');
        expect(tab()).toBe('write');
    });

    it('leaves the tab list with Tab: the next stop is the panel', () => {
        renderTabs();
        fireEvent.click(tabNamed('Help'));
        // The Tab order (jsdom has none): what can take focus, in order.
        const stops = Array.from(
            document.querySelectorAll<HTMLElement>('button, textarea')
        ).filter((el) => el.tabIndex >= 0);

        expect(stops).toEqual([
            tabNamed('Help'),
            screen.getByRole('textbox', { name: 'Body' }),
        ]);
    });
});

describe('NavTabs', () => {
    it('is a named nav of links, the current one marked', async () => {
        render(() => (
            <MemoryRouter>
                <Route
                    path="*"
                    component={() => (
                        <NavTabs
                            label="Package"
                            value="runs"
                            tabs={[
                                {
                                    value: 'workflows',
                                    label: 'Workflows',
                                    href: '/p/1',
                                },
                                {
                                    value: 'runs',
                                    label: 'Runs',
                                    href: '/p/1/runs',
                                },
                            ]}
                        />
                    )}
                />
            </MemoryRouter>
        ));
        const nav = await screen.findByRole('navigation', { name: 'Package' });
        const runs = screen.getByRole('link', { name: 'Runs' });
        expect(nav.contains(runs)).toBe(true);
        expect(runs.getAttribute('href')).toBe('/p/1/runs');
        expect(runs.getAttribute('aria-current')).toBe('page');
        expect(
            screen
                .getByRole('link', { name: 'Workflows' })
                .getAttribute('aria-current')
        ).toBeNull();
    });
});
