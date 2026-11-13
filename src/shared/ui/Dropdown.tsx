import { createEffect, createSignal, onCleanup, For } from 'solid-js';
import { createDismiss } from '@shared/lib/dismiss';
import './dropdown.scss';

type DropdownOption<T> = {
    value: T;
    label: string;
    ariaLabel?: string;
};

function levenshteinLimited(a: string, b: string, maxDist: number): number {
    const lenA = a.length;
    const lenB = b.length;

    if (Math.abs(lenA - lenB) > maxDist) return maxDist + 1;

    const dp = new Array<number>(lenB + 1);
    for (let j = 0; j <= lenB; j++) {
        dp[j] = j;
    }

    for (let i = 1; i <= lenA; i++) {
        let prev = dp[0];
        dp[0] = i;
        let rowMin = dp[0];

        for (let j = 1; j <= lenB; j++) {
            const temp = dp[j];
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;

            dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);

            prev = temp;

            if (dp[j] < rowMin) {
                rowMin = dp[j];
            }
        }

        if (rowMin > maxDist) {
            return maxDist + 1;
        }
    }

    return dp[lenB];
}

function fuzzy(str: string, query: string): boolean {
    let qi = 0;
    for (let si = 0; si < str.length && qi < query.length; si++) {
        if (str[si].toLowerCase() === query[qi].toLowerCase()) {
            qi++;
        }
    }
    return qi === query.length;
}

type DropdownProps<T> = {
    options: DropdownOption<T>[];
    selectedValue: T;
    onChange: (value: T) => void;
    ariaLabel?: string;
    /** Shown when the search matches nothing. */
    noResults?: string;
};

export function Dropdown<T>(props: DropdownProps<T>) {
    const [isOpen, setIsOpen] = createSignal(false);
    const [searchTerm, setSearchTerm] = createSignal('');
    const [dropUp, setDropUp] = createSignal(false);
    let dropdownRef: HTMLDivElement | undefined;
    let menuRef: HTMLDivElement | undefined;

    const calculateDropUp = () => {
        if (!dropdownRef || !menuRef) return;
        const triggerRect = dropdownRef.getBoundingClientRect();
        const menuHeight = menuRef.getBoundingClientRect().height;
        setDropUp(triggerRect.bottom + menuHeight > window.innerHeight);
    };

    const close = () => {
        setIsOpen(false);
        setSearchTerm('');
    };

    // A click elsewhere and Escape close it.
    createDismiss(() => dropdownRef, isOpen, close);

    // Focus that leaves an element outside it closes it as well.
    const handleFocusOut = (event: Event) => {
        if (dropdownRef && !dropdownRef.contains(event.target as Node)) close();
    };

    // While open: typing filters the list; a scroll may flip it up or down.
    createEffect(() => {
        if (!isOpen()) return;
        document.addEventListener('focusout', handleFocusOut);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('scroll', calculateDropUp, true);
        onCleanup(() => {
            document.removeEventListener('focusout', handleFocusOut);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', calculateDropUp, true);
        });
    });

    const toggleDropdown = () => {
        if (isOpen()) {
            close();
            return;
        }
        setIsOpen(true);
        requestAnimationFrame(calculateDropUp);
    };

    const selectedOption = () =>
        props.options.find((o) => o.value === props.selectedValue);

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen()) return;

        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            setSearchTerm((prev) => prev + e.key);
            e.preventDefault();
        } else if (e.key === 'Backspace') {
            setSearchTerm((prev) => prev.slice(0, -1));
            e.preventDefault();
        }
    };

    enum MatchPriority {
        None = -1,
        Levenshtein = 0,
        Fuzzy = 1,
    }

    type Match = {
        option: DropdownOption<T>;
        priority: MatchPriority;
        levDist: number;
    };

    const filteredOptions = () => {
        const q = searchTerm().trim().toLowerCase();
        if (!q) return props.options;

        const matches = props.options
            .map((opt): Match | null => {
                const fieldsToCheck = [
                    opt.label.toLowerCase(),
                    (opt.ariaLabel ?? '').toLowerCase(),
                ];

                let priority: MatchPriority = MatchPriority.None;
                let levDist = Number.MAX_SAFE_INTEGER;

                for (const field of fieldsToCheck) {
                    if (fuzzy(field, q)) {
                        priority = MatchPriority.Fuzzy;
                        levDist = 0;
                        break;
                    } else {
                        const levDistLimit = 2;
                        const currentLevDist = levenshteinLimited(
                            field,
                            q,
                            levDistLimit
                        );
                        if (
                            currentLevDist <= levDistLimit &&
                            (priority === MatchPriority.None ||
                                currentLevDist < levDist)
                        ) {
                            priority = MatchPriority.Levenshtein;
                            levDist = currentLevDist;
                        }
                    }
                }

                if (priority === MatchPriority.None) return null;

                return { option: opt, priority, levDist };
            })
            .filter((m): m is Match => m !== null);

        matches.sort((a, b) => {
            if (a.priority !== b.priority) return b.priority - a.priority;
            return a.levDist - b.levDist;
        });

        return matches.map((m) => m.option);
    };

    return (
        <div
            class="dropdown"
            ref={dropdownRef}
            data-open={isOpen()}
            data-drop-up={dropUp()}
        >
            <div
                role="button"
                tabindex="0"
                class="select"
                aria-label={props.ariaLabel}
                // On hover: what it is for, and what is chosen (the button
                // may show only a short label, such as "RU").
                title={[props.ariaLabel, selectedOption()?.ariaLabel]
                    .filter(Boolean)
                    .join(': ')}
                onClick={toggleDropdown}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleDropdown();
                    }
                }}
                style={{
                    'min-width': `${selectedOption()?.label.length ?? 5}ch`,
                }}
            >
                <span class="noselect" aria-label={selectedOption()?.ariaLabel}>
                    {selectedOption()?.label ?? 'Select'}
                </span>
                <i class="uil uil-arrow-down" />
            </div>

            {isOpen() && (
                <div class="dropdown-menu" role="listbox" ref={menuRef}>
                    {/* What is typed filters the list; shown above it, not in the button. */}
                    {searchTerm().trim() !== '' && (
                        <div class="dropdown-search" aria-hidden="true">
                            {searchTerm()}
                        </div>
                    )}
                    <For each={filteredOptions()}>
                        {(option) => (
                            <div
                                role="option"
                                tabindex="0"
                                class="dropdown-item"
                                aria-label={option.ariaLabel}
                                onClick={(e) => {
                                    e.preventDefault();
                                    props.onChange(option.value);
                                    close();
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        props.onChange(option.value);
                                        close();
                                    }
                                }}
                            >
                                <span class="noselect dropdown-label">
                                    {option.label}
                                </span>
                                {option.ariaLabel && (
                                    <span class="noselect dropdown-name">
                                        {option.ariaLabel}
                                    </span>
                                )}
                            </div>
                        )}
                    </For>
                    {filteredOptions().length === 0 && (
                        <div class="dropdown-no-results">
                            {props.noResults ?? 'No matches'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
