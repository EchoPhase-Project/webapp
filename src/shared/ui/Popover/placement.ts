/** Which side of the anchor a panel opens on. */
export type PopoverSide = 'bottom' | 'right';

/**
 * Which edge of the anchor the panel lines up with. Under the anchor: its
 * left (start) or its right (end) edge. Beside it: its top (start) or its
 * bottom (end) edge.
 */
export type PopoverAlign = 'start' | 'end';

export type PlacementOptions = {
    /** Under the anchor (the default; above it when there is no room) or to its right. */
    side?: PopoverSide;
    align?: PopoverAlign;
    /** The space between the anchor (or the box) and the panel, in pixels. */
    gap?: number;
    /** A shift along the anchor's edge, in pixels: to the right or down. */
    offset?: number;
    /** Side "right": the space kept between the panel and the window's top and bottom. */
    margin?: number;
    /**
     * Side "right": the element whose right edge the panel opens from (e.g.
     * the whole side rail); the anchor gives the height. The anchor itself
     * without it.
     */
    box?: HTMLElement;
};

/** The coordinates of a fixed panel, in CSS pixels or 'auto'. */
export type Placement = {
    top: string;
    bottom: string;
    left: string;
    right: string;
    /** Under the anchor: the panel opens above it instead. */
    up: boolean;
};

type Rect = Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right' | 'width'>;

export const DEFAULT_GAP = 4;
export const DEFAULT_MARGIN = 8;

const px = (n: number) => `${n}px`;

/**
 * Where a fixed panel of `height` goes next to an anchor, in a window of
 * `viewport` (its width without the scroll bar). Under the anchor, it opens
 * upwards when it does not fit below and there is more room above. To the
 * right, it stays inside the window from top to bottom.
 */
export function computePlacement(
    anchor: Rect,
    height: number,
    viewport: { width: number; height: number },
    options: PlacementOptions = {},
    box: Rect = anchor
): Placement {
    const gap = options.gap ?? DEFAULT_GAP;
    const offset = options.offset ?? 0;
    const align = options.align ?? 'start';

    if (options.side === 'right') {
        const margin = options.margin ?? DEFAULT_MARGIN;
        const wanted =
            align === 'end'
                ? anchor.bottom - height + offset
                : anchor.top + offset;
        const top = Math.max(
            margin,
            Math.min(wanted, viewport.height - margin - height)
        );
        return {
            top: px(top),
            bottom: 'auto',
            left: px(box.right + gap),
            right: 'auto',
            up: false,
        };
    }

    const below = viewport.height - anchor.bottom;
    const above = anchor.top;
    const up = height > below && above > below;
    // A fixed box's right is from the window's edge, without the scroll bar.
    const horizontal =
        align === 'end'
            ? {
                  left: 'auto',
                  right: px(viewport.width - anchor.right - offset),
              }
            : { left: px(anchor.left + offset), right: 'auto' };
    return {
        top: up ? 'auto' : px(anchor.bottom + gap),
        bottom: up ? px(viewport.height - anchor.top + gap) : 'auto',
        ...horizontal,
        up,
    };
}

/**
 * Measures the anchor and the panel and returns where the panel goes. With
 * `write`, it also gives the panel fixed coordinates and the anchor's width
 * (--popover-anchor-width); without it, the stylesheet places the panel.
 */
export function placePanel(
    anchor: HTMLElement,
    panel: HTMLElement,
    options: PlacementOptions,
    write: boolean
): Placement {
    const rect = anchor.getBoundingClientRect();
    const placement = computePlacement(
        rect,
        panel.getBoundingClientRect().height,
        {
            width: document.documentElement.clientWidth || window.innerWidth,
            height: window.innerHeight,
        },
        options,
        options.box?.getBoundingClientRect() ?? rect
    );
    if (write) {
        const s = panel.style;
        s.position = 'fixed';
        s.top = placement.top;
        s.bottom = placement.bottom;
        s.left = placement.left;
        s.right = placement.right;
        s.setProperty('--popover-anchor-width', px(rect.width));
    }
    return placement;
}

/**
 * Runs `place` again on each scroll (of the page or of any scrolling
 * parent) and each resize. Returns the function that stops it.
 */
export function followPlacement(place: () => void): () => void {
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
        window.removeEventListener('scroll', place, true);
        window.removeEventListener('resize', place);
    };
}
