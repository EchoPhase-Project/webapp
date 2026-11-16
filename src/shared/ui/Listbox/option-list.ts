import {
    createSignal,
    createUniqueId,
    onCleanup,
    type Accessor,
} from 'solid-js';

/** One choice of a Listbox or a Combobox. */
export type ListOption<T> = {
    value: T;
    /** Shown in the list; the option's accessible name. */
    label: string;
    /** Shown on a closed select-only Combobox instead of the label (e.g. "EN"). */
    short?: string;
    /** A second, quieter line in the list. */
    hint?: string;
    disabled?: boolean;
};

/** How long typed letters stay together as one search (type-ahead). */
export const TYPE_AHEAD_MS = 500;
/**
 * What made an option active: the keyboard (the arrows, Home, End, the
 * pages, type-ahead, a key that opens a list) or the pointer (hover, a
 * click). Only the keyboard's active option gets an outline.
 */
export type ActiveBy = 'keys' | 'pointer';

/** How far PageUp and PageDown move. */
const PAGE = 10;

/**
 * The state of a list of options, without markup: the ids of the options,
 * the active one (the one aria-activedescendant points at), the moves of
 * the keyboard and type-ahead. Listbox and Combobox build on it.
 */
export type OptionList = {
    /** The id of the list element. */
    id: string;
    /** The id of the option at `index`. */
    optionId: (index: number) => string;
    /** The index of the active option, or -1 for none. */
    active: Accessor<number>;
    /** The id of the active option, for aria-activedescendant. */
    activeId: Accessor<string | undefined>;
    /** Makes the option at `index` active (-1: none), by the keys or the pointer. */
    setActive: (index: number, by: ActiveBy) => void;
    /** Whether the keyboard made the active option active (not the pointer). */
    activeByKeys: Accessor<boolean>;
    /** Whether the option at `index` exists and is not disabled. */
    enabled: (index: number) => boolean;
    /** The first enabled option, or -1 if there is none. */
    firstEnabled: () => number;
    /**
     * Does the move of a key (the arrows, Home, End, PageUp, PageDown) and
     * returns the new active index; undefined if the key does not move.
     * The moves skip disabled options and do not wrap around.
     */
    move: (key: string) => number | undefined;
    /**
     * Adds a typed letter to the search and makes the next option whose
     * label starts with it active. One letter typed again goes through the
     * options that start with it. Returns the new index, or undefined if
     * nothing matches.
     */
    typeAhead: (char: string) => number | undefined;
    /** Whether a type-ahead search is going on (a Space is then a letter). */
    typing: () => boolean;
    /** Scrolls the active option into the visible part of its list. */
    scrollActiveIntoView: () => void;
    /** Scrolls the option at `index` into the visible part of its list. */
    scrollIntoView: (index: number) => void;
};

/**
 * Makes the state of a list of options (see OptionList). Call it in a
 * component: the ids and the type-ahead timer belong to the owner.
 */
export function createOptionList<T>(
    options: Accessor<readonly ListOption<T>[]>
): OptionList {
    const id = createUniqueId();
    const optionId = (index: number) => `${id}-option-${index}`;
    const [raw, setRaw] = createSignal(-1);
    const [by, setBy] = createSignal<ActiveBy>('keys');
    const setActive = (index: number, how: ActiveBy) => {
        setRaw(index);
        setBy(how);
    };
    const active = () => {
        const i = raw();
        return i >= 0 && i < options().length ? i : -1;
    };

    const enabled = (index: number) => {
        const option = options()[index];
        return option !== undefined && !option.disabled;
    };

    // The first enabled index from `from` in the direction `dir`, or -1.
    function seek(from: number, dir: 1 | -1): number {
        for (let i = from; i >= 0 && i < options().length; i += dir) {
            if (enabled(i)) return i;
        }
        return -1;
    }

    // Moves `by` places (1, -1, ±PAGE) but stops at the ends; a disabled
    // target gives the nearest enabled option before it, then after it.
    function step(by: number): number {
        const from = active();
        const last = options().length - 1;
        if (from < 0) return by > 0 ? seek(0, 1) : seek(last, -1);
        const dir = by > 0 ? 1 : -1;
        const target = Math.min(Math.max(from + by, 0), last);
        let found = seek(target, dir === 1 ? -1 : 1);
        if (found === from || (found - from) * dir < 0) found = -1;
        if (found < 0) found = seek(target + dir, dir);
        return found < 0 ? from : found;
    }

    const moves: Record<string, () => number> = {
        ArrowDown: () => step(1),
        ArrowUp: () => step(-1),
        PageDown: () => step(PAGE),
        PageUp: () => step(-PAGE),
        Home: () => seek(0, 1),
        End: () => seek(options().length - 1, -1),
    };

    function move(key: string): number | undefined {
        const to = moves[key];
        if (!to) return undefined;
        const index = to();
        if (index >= 0) setActive(index, 'keys');
        return active();
    }

    let buffer = '';
    let timer: ReturnType<typeof setTimeout> | undefined;
    onCleanup(() => clearTimeout(timer));

    function typeAhead(char: string): number | undefined {
        clearTimeout(timer);
        buffer += char.toLocaleLowerCase();
        timer = setTimeout(() => (buffer = ''), TYPE_AHEAD_MS);

        const first = buffer[0];
        const repeated = [...buffer].every((c) => c === first);
        const query = repeated ? first : buffer;
        // A new letter looks after the active option; a longer search may
        // still match the active option itself.
        const start = repeated ? active() + 1 : Math.max(active(), 0);
        const count = options().length;
        for (let k = 0; k < count; k++) {
            const i = (start + k) % count;
            const label = options()[i]?.label.toLocaleLowerCase() ?? '';
            if (enabled(i) && label.startsWith(query)) {
                setActive(i, 'keys');
                return i;
            }
        }
        return undefined;
    }

    function scrollIntoView(index: number) {
        if (index < 0 || index >= options().length) return;
        const el = document.getElementById(optionId(index));
        // jsdom has no layout and no scrollIntoView.
        if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ block: 'nearest' });
        }
    }

    return {
        id,
        optionId,
        active,
        activeId: () => {
            const index = active();
            return index < 0 ? undefined : optionId(index);
        },
        setActive,
        activeByKeys: () => by() === 'keys',
        enabled,
        firstEnabled: () => seek(0, 1),
        move,
        typeAhead,
        typing: () => buffer !== '',
        scrollActiveIntoView: () => scrollIntoView(active()),
        scrollIntoView,
    };
}

/** Whether `values` has `value` (Object.is, as the list controls compare). */
export function hasValue<T>(values: readonly T[], value: T): boolean {
    return values.some((v) => Object.is(v, value));
}

/** `values` with `value` added, or removed if it was there. */
export function toggleValue<T>(values: readonly T[], value: T): T[] {
    return hasValue(values, value)
        ? values.filter((v) => !Object.is(v, value))
        : [...values, value];
}

/** The index of the option with `value`, or -1. */
export function indexOfValue<T>(
    options: readonly ListOption<T>[],
    value: T
): number {
    return options.findIndex((o) => Object.is(o.value, value));
}
