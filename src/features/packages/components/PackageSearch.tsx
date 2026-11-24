import { createSignal, For, Show } from 'solid-js';
import { useQuery } from '@tanstack/solid-query';
import { IconSearch, IconX } from '@shared/ui/icons';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import { createOptionList } from '@shared/ui/Listbox';
import { exploreTagsQuery } from '@features/packages/api/packages';

/** What a search line asks for: a tag (`tag:name`, the last one wins) and words. */
export function parseQuery(text: string): { tag: string; words: string } {
    let tag = '';
    const words: string[] = [];
    for (const part of text.trim().split(/\s+/).filter(Boolean)) {
        const match = /^tag:(.+)$/i.exec(part);
        if (match) tag = match[1].toLowerCase();
        else words.push(part);
    }
    return { tag, words: words.join(' ') };
}

/** The line for a tag and words: `tag:name words`. */
export const queryOf = (tag: string, words: string) =>
    [tag ? `tag:${tag}` : '', words].filter(Boolean).join(' ');

/** The word being typed: the last one, unless the line ends with a space. */
const lastToken = (text: string) =>
    /\s$/.test(text) ? '' : (text.split(/\s+/).pop() ?? '');

/** The qualifiers a search line takes, offered while nothing else is typed. */
const QUALIFIERS = ['tag:'] as const;

interface Suggestion {
    /** What replaces the word being typed. */
    insert: string;
    label: string;
    hint: string;
    /** Done after it (a whole tag), or more to type (a qualifier). */
    final: boolean;
}

/**
 * One search line, as on GitHub: words, and qualifiers in the same text
 * (`tag:discord-bot`). Focused, it offers the qualifiers; after `tag:`,
 * the tags in use (from the server). Arrows move (createOptionList: the
 * keys of every list), Enter picks, Escape closes; Home and End stay with
 * the text. A cross clears the line.
 */
export default function PackageSearch(props: {
    value: string;
    onInput: (value: string) => void;
}) {
    const t = useLocalizer('packages');
    let input: HTMLInputElement | undefined;
    const [open, setOpen] = createSignal(false);

    const token = () => lastToken(props.value);
    const tagPrefix = () => /^tag:(.*)$/i.exec(token())?.[1];

    // Only while the list is open after `tag:`. A failure offers no tags:
    // the search still works without them.
    const tags = useQuery(() => ({
        ...exploreTagsQuery(tagPrefix() ?? ''),
        enabled: open() && tagPrefix() !== undefined,
    }));

    const suggestions = (): Suggestion[] => {
        const prefix = tagPrefix();
        if (prefix !== undefined)
            return (tags.data ?? []).map((tag) => ({
                insert: `tag:${tag.tag}`,
                label: tag.tag,
                hint: t('search_hint.packages', '{count} packages', {
                    count: tag.packages,
                }),
                final: true,
            }));
        const typed = token().toLowerCase();
        return QUALIFIERS.filter((q) => q.startsWith(typed)).map((q) => ({
            insert: q,
            label: q,
            hint: t('search_hint.tag', 'packages with this tag'),
            final: false,
        }));
    };

    const shown = () => open() && suggestions().length > 0;

    const list = createOptionList(() =>
        suggestions().map((s) => ({ value: s.insert, label: s.label }))
    );
    // The first suggestion is ready for Enter, as on GitHub.
    const start = () => list.setActive(0, 'keys');
    const chosen = () => suggestions()[Math.max(list.active(), 0)];

    function pick(s: Suggestion) {
        const before = props.value.slice(
            0,
            props.value.length - token().length
        );
        props.onInput(`${before}${s.insert}${s.final ? ' ' : ''}`);
        start();
        if (s.final) setOpen(false);
        input?.focus();
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            setOpen(false);
            return;
        }
        if (!shown()) {
            if (e.key === 'ArrowDown') {
                setOpen(true);
                start();
            }
            return;
        }
        // Home and End move in the text, not in the list.
        if (
            e.key !== 'Home' &&
            e.key !== 'End' &&
            list.move(e.key) !== undefined
        ) {
            e.preventDefault();
            list.scrollActiveIntoView();
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            const s = chosen();
            if (s && (e.key === 'Enter' || !s.final)) {
                e.preventDefault();
                pick(s);
            }
        }
    }

    return (
        <div class="packages-search-wrap" role="search">
            <div class="field field--compact packages-search">
                <IconSearch class="field-icon" />
                <label class="visually-hidden" for="packages-search">
                    {t('search', 'Search packages')}
                </label>
                <input
                    ref={input}
                    id="packages-search"
                    name="q"
                    type="text"
                    role="combobox"
                    class="field-input"
                    autocomplete="off"
                    spellcheck={false}
                    aria-autocomplete="list"
                    aria-expanded={shown()}
                    aria-controls={list.id}
                    aria-activedescendant={
                        shown() ? list.activeId() : undefined
                    }
                    placeholder={t(
                        'search_placeholder',
                        'Search packages, or tag:name'
                    )}
                    value={props.value}
                    onFocus={() => {
                        setOpen(true);
                        start();
                    }}
                    onBlur={() => setOpen(false)}
                    onInput={(e) => {
                        setOpen(true);
                        start();
                        props.onInput(e.currentTarget.value);
                    }}
                    onKeyDown={onKeyDown}
                />
                <Show when={props.value}>
                    <Button
                        variant="icon"
                        class="packages-search-clear"
                        aria-label={t('search_clear', 'Clear the search')}
                        title={t('search_clear', 'Clear the search')}
                        onClick={() => {
                            props.onInput('');
                            input?.focus();
                        }}
                    >
                        <IconX />
                    </Button>
                </Show>
            </div>
            <ul
                id={list.id}
                role="listbox"
                class="packages-suggestions"
                hidden={!shown()}
                aria-label={t('search_hint.title', 'Filters')}
            >
                <For each={suggestions()}>
                    {(s, i) => (
                        <li
                            id={list.optionId(i())}
                            role="option"
                            class="packages-suggestion"
                            aria-selected={i() === list.active()}
                            // Picked before the input's blur closes the list.
                            onMouseDown={(e) => {
                                e.preventDefault();
                                pick(s);
                            }}
                            onMouseEnter={() => list.setActive(i(), 'pointer')}
                        >
                            <span class="packages-suggestion-label">
                                {s.label}
                            </span>
                            <span class="muted">{s.hint}</span>
                        </li>
                    )}
                </For>
            </ul>
        </div>
    );
}
