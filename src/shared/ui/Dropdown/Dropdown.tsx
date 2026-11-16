import { createEffect, createSignal, onCleanup, For } from 'solid-js';
import { createDismiss } from '@shared/lib/dismiss';
import { matchOptions } from '@shared/lib/text-match';
import './dropdown.scss';

type DropdownOption<T> = {
    value: T;
    label: string;
    ariaLabel?: string;
};

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

    // Search both the short label and the full name.
    const filteredOptions = () =>
        matchOptions(props.options, searchTerm(), (opt) => [
            opt.label,
            opt.ariaLabel ?? '',
        ]);

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
                aria-haspopup="listbox"
                aria-expanded={isOpen()}
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
                <span class="noselect">
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
                                aria-selected={
                                    option.value === props.selectedValue
                                }
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
