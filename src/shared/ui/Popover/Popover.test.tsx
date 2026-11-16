// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { expectNoA11yViolations } from '@shared/testing/axe';
import Popover, { type PopoverProps } from './Popover';
import { computePlacement } from './placement';

// jsdom has no Popover API: these tests give it one.
const proto = HTMLElement.prototype as unknown as {
    showPopover?: () => void;
    hidePopover?: () => void;
    togglePopover?: () => void;
};

let show = vi.fn<() => void>();
let hide = vi.fn<() => void>();

function stubApi() {
    show = vi.fn<() => void>();
    hide = vi.fn<() => void>();
    proto.showPopover = show;
    proto.hidePopover = hide;
    proto.togglePopover = vi.fn();
}

function removeApi() {
    delete proto.showPopover;
    delete proto.hidePopover;
    delete proto.togglePopover;
}

/** What the browser sends when it hides a popover (light dismiss). */
function toggleClosed(el: Element) {
    const e = new Event('toggle');
    Object.defineProperty(e, 'newState', { value: 'closed' });
    Object.defineProperty(e, 'oldState', { value: 'open' });
    el.dispatchEvent(e);
}

function renderPanel(over: Partial<PopoverProps> = {}) {
    const onClose = vi.fn();
    const [open, setOpen] = createSignal(false);
    let trigger: HTMLButtonElement | undefined;
    render(() => (
        <div>
            <button
                ref={trigger}
                type="button"
                aria-expanded={open()}
                aria-controls="panel"
                onClick={() => setOpen((v) => !v)}
            >
                Menu
            </button>
            <Popover
                open={open()}
                onClose={() => {
                    onClose();
                    setOpen(false);
                }}
                anchor={() => trigger}
                id="panel"
                role="region"
                label="Menu"
                {...over}
            >
                <button type="button">Inside</button>
            </Popover>
        </div>
    ));
    const button = screen.getByRole('button', { name: 'Menu' });
    return { button, onClose, open };
}

// jsdom hides a [popover] that the stub did not really show.
const panel = () => document.getElementById('panel');

describe('Popover', () => {
    beforeEach(() => stubApi());
    afterEach(() => {
        removeApi();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('opens into the top layer and closes', async () => {
        const { button } = renderPanel();
        expect(panel()).toBeNull();

        fireEvent.click(button);
        const el = panel();
        expect(el?.getAttribute('popover')).toBe('auto');
        expect(el?.classList.contains('popover')).toBe(true);
        expect(show).toHaveBeenCalledTimes(1);
        expect(show.mock.contexts[0]).toBe(el);
        // It stays in its place in the DOM.
        expect(button.parentElement?.contains(el ?? null)).toBe(true);
        expect(el?.getAttribute('role')).toBe('region');
        expect(el?.getAttribute('aria-label')).toBe('Menu');
        await expectNoA11yViolations();

        fireEvent.click(button);
        expect(hide).toHaveBeenCalledTimes(1);
        expect(hide.mock.contexts[0]).toBe(el);
        expect(panel()).toBeNull();
    });

    it('takes the manual mode', () => {
        const { button } = renderPanel({ mode: 'manual' });
        fireEvent.click(button);
        expect(panel()?.getAttribute('popover')).toBe('manual');
        // No light dismiss of its own.
        fireEvent.pointerDown(document.body);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(panel()).not.toBeNull();
    });

    it('calls onClose when the browser closes it (light dismiss)', () => {
        const { button, onClose, open } = renderPanel();
        fireEvent.click(button);
        const el = panel();
        if (!el) throw new Error('no panel');

        fireEvent.pointerDown(document.body);
        toggleClosed(el);

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(open()).toBe(false);
        expect(panel()).toBeNull();
        expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    it('stays closed after a click on the trigger of an open panel', () => {
        vi.useFakeTimers();
        const { button, open } = renderPanel();
        fireEvent.click(button);
        const el = panel();
        if (!el) throw new Error('no panel');

        // The browser hides it on the press, before the click.
        fireEvent.pointerDown(button);
        toggleClosed(el);
        fireEvent.click(button);
        vi.runAllTimers();

        expect(open()).toBe(false);
        expect(panel()).toBeNull();
        expect(show).toHaveBeenCalledTimes(1);
    });

    it('stays closed when the toggle event comes after the click', () => {
        vi.useFakeTimers();
        const { button, open } = renderPanel();
        fireEvent.click(button);
        const el = panel();
        if (!el) throw new Error('no panel');

        fireEvent.pointerDown(button);
        fireEvent.click(button);
        toggleClosed(el);
        vi.runAllTimers();

        expect(open()).toBe(false);
        expect(show).toHaveBeenCalledTimes(1);
        // Opens again on the next click.
        fireEvent.pointerDown(button);
        fireEvent.click(button);
        expect(open()).toBe(true);
        expect(show).toHaveBeenCalledTimes(2);
    });

    it('closes when a press on the trigger ends with no click on it', () => {
        vi.useFakeTimers();
        const { button, onClose, open } = renderPanel();
        fireEvent.click(button);
        const el = panel();
        if (!el) throw new Error('no panel');

        fireEvent.pointerDown(button);
        toggleClosed(el);
        expect(open()).toBe(true);
        // The pointer went up somewhere else.
        fireEvent.click(document.body);
        vi.runAllTimers();

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(open()).toBe(false);
    });

    it('gives the focus back to the trigger when Escape closes it', () => {
        const { button, onClose } = renderPanel();
        fireEvent.click(button);
        const el = panel();
        if (!el) throw new Error('no panel');
        // jsdom cannot focus in a [popover] that the stub did not show.
        el.removeAttribute('popover');
        const insideButton = el.querySelector('button');
        insideButton?.focus();
        expect(document.activeElement).toBe(insideButton);

        fireEvent.keyDown(insideButton ?? document, { key: 'Escape' });
        toggleClosed(el);

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(button);
    });

    it('leaves the focus alone after a press outside', () => {
        const { button } = renderPanel();
        fireEvent.click(button);
        const el = panel();
        if (!el) throw new Error('no panel');
        const outside = document.createElement('input');
        document.body.append(outside);
        outside.focus();

        fireEvent.pointerDown(outside);
        toggleClosed(el);

        expect(document.activeElement).toBe(outside);
        outside.remove();
    });
});

describe('Popover, without the API', () => {
    beforeEach(() => removeApi());

    it('shows without [popover] and closes on a press outside and on Escape', async () => {
        const { button, onClose, open } = renderPanel();
        expect(() => fireEvent.click(button)).not.toThrow();
        const el = panel();
        expect(el?.hasAttribute('popover')).toBe(false);
        expect(screen.getByRole('region', { name: 'Menu' })).toBeTruthy();
        await expectNoA11yViolations();

        // A press in the panel or on the trigger keeps it.
        const insideButton = screen.getByRole('button', { name: 'Inside' });
        fireEvent.pointerDown(insideButton);
        fireEvent.pointerDown(button);
        expect(open()).toBe(true);

        fireEvent.pointerDown(document.body);
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(panel()).toBeNull();

        fireEvent.click(button);
        screen.getByRole('button', { name: 'Inside' }).focus();
        fireEvent.keyDown(document.activeElement ?? document, {
            key: 'Escape',
        });
        expect(open()).toBe(false);
        expect(document.activeElement).toBe(button);
    });

    it('closes on a click of its trigger', () => {
        const { button, open } = renderPanel();
        fireEvent.click(button);
        fireEvent.pointerDown(button);
        fireEvent.click(button);
        expect(open()).toBe(false);
    });

    it('still places the panel with fixed coordinates', () => {
        const { button } = renderPanel({ align: 'end', gap: 8 });
        vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
        vi.spyOn(
            HTMLElement.prototype,
            'getBoundingClientRect'
        ).mockImplementation(function (this: HTMLElement) {
            if (this.id === 'panel')
                return { top: 0, bottom: 200, height: 200 } as DOMRect;
            return {
                top: 10,
                bottom: 42,
                left: 900,
                right: 940,
                width: 40,
            } as DOMRect;
        });
        Object.defineProperty(document.documentElement, 'clientWidth', {
            configurable: true,
            value: 1000,
        });
        fireEvent.click(button);
        const style = panel()?.style;
        expect(style?.position).toBe('fixed');
        expect(style?.top).toBe('50px');
        expect(style?.right).toBe('60px');
        expect(style?.left).toBe('auto');
        expect(style?.getPropertyValue('--popover-anchor-width')).toBe('40px');
        Object.defineProperty(document.documentElement, 'clientWidth', {
            configurable: true,
            value: 0,
        });
    });
});

describe('Popover, placement', () => {
    const viewport = { width: 1000, height: 800 };
    const anchor = { top: 100, bottom: 132, left: 600, right: 720, width: 120 };

    it('puts the panel under the anchor at its start edge', () => {
        expect(computePlacement(anchor, 300, viewport)).toEqual({
            top: '136px',
            bottom: 'auto',
            left: '600px',
            right: 'auto',
            up: false,
        });
    });

    it('lines up the right edges with align end', () => {
        const p = computePlacement(anchor, 300, viewport, {
            align: 'end',
            gap: 8,
        });
        expect(p.top).toBe('140px');
        expect(p.left).toBe('auto');
        expect(p.right).toBe('280px');
    });

    it('opens above when it does not fit below and there is more room above', () => {
        const low = { ...anchor, top: 700, bottom: 732 };
        const p = computePlacement(low, 300, viewport);
        expect(p.up).toBe(true);
        expect(p.top).toBe('auto');
        expect(p.bottom).toBe('104px');
        // No more room above: it stays below.
        expect(
            computePlacement(low, 800, { ...viewport, height: 1500 }).up
        ).toBe(false);
    });

    it('opens to the right of the box, level with the anchor', () => {
        const rail = { top: 0, bottom: 800, left: 0, right: 64, width: 64 };
        const p = computePlacement(
            anchor,
            200,
            viewport,
            { side: 'right', gap: 8, offset: -6 },
            rail
        );
        expect(p).toEqual({
            top: '94px',
            bottom: 'auto',
            left: '72px',
            right: 'auto',
            up: false,
        });
    });

    it('lines up the bottom edges beside the anchor with align end', () => {
        const p = computePlacement(anchor, 50, viewport, {
            side: 'right',
            align: 'end',
        });
        expect(p.top).toBe('82px');
        expect(p.left).toBe('724px');
    });

    it('keeps a panel on the right inside the window', () => {
        const low = { ...anchor, top: 760, bottom: 792 };
        expect(
            computePlacement(low, 300, viewport, { side: 'right' }).top
        ).toBe('492px');
        const high = { ...anchor, top: 2, bottom: 34 };
        expect(
            computePlacement(high, 100, viewport, {
                side: 'right',
                offset: -6,
            }).top
        ).toBe('8px');
        // Higher than the window: from the top margin.
        expect(
            computePlacement(anchor, 2000, viewport, { side: 'right' }).top
        ).toBe('8px');
    });
});
