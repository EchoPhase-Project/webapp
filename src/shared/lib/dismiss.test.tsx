// @vitest-environment jsdom
import { createSignal } from 'solid-js';
import { fireEvent, render } from '@solidjs/testing-library';
import { describe, expect, it, vi } from 'vitest';
import { createDismiss } from './dismiss';

function Popup(props: { open: boolean; onClose: () => void }) {
    let root: HTMLDivElement | undefined;
    createDismiss(
        () => root,
        () => props.open,
        () => props.onClose()
    );
    return (
        <div>
            <div ref={root} data-testid="inside" />
            <p data-testid="outside" />
        </div>
    );
}

describe('createDismiss', () => {
    it('closes on a click outside and on Escape, while open', () => {
        const onClose = vi.fn();
        const [open, setOpen] = createSignal(true);
        const { getByTestId } = render(() => (
            <Popup open={open()} onClose={onClose} />
        ));

        fireEvent.click(getByTestId('inside'));
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.click(getByTestId('outside'));
        expect(onClose).toHaveBeenCalledOnce();

        const escape = new KeyboardEvent('keydown', {
            key: 'Escape',
            cancelable: true,
        });
        document.dispatchEvent(escape);
        expect(onClose).toHaveBeenCalledTimes(2);
        expect(escape.defaultPrevented).toBe(true);

        setOpen(false);
        fireEvent.click(getByTestId('outside'));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});
