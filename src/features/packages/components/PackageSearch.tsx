import {
    createResource,
    createSignal,
    createUniqueId,
    For,
    Show,
} from 'solid-js';
import { AiOutlineClose, AiOutlineSearch } from 'solid-icons/ai';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { exploreTags } from '@features/packages/api';

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
export const lastToken = (text: string) =>
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
 * the tags in use (from the server). Arrows move, Enter picks, Escape
 * closes; a cross clears the line.
 */
export default function PackageSearch(props: {
    value: string;
    onInput: (value: string) => void;
}) {
    const t = useLocalizer('packages');
    const listId = createUniqueId();
    let input: HTMLInputElement | undefined;
    const [open, setOpen] = createSignal(false);
    const [active, setActive] = createSignal(0);

    const token = () => lastToken(props.value);
    const tagPrefix = () => /^tag:(.*)$/i.exec(token())?.[1];

    const [tags] = createResource(
        () => (open() && tagPrefix() !== undefined ? tagPrefix() : false),
        (prefix: string) => exploreTags(prefix)
    );

    const suggestions = (): Suggestion[] => {
        const prefix = tagPrefix();
        if (prefix !== undefined)
            return (tags() ?? []).map((tag) => ({
                insert: `tag:${tag.tag}`,
                label: tag.tag,
                hint: t('search_hint.packages', '{count} packages').replace(
                    '{count}',
                    String(tag.packages)
                ),
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

    function pick(s: Suggestion) {
        const before = props.value.slice(
            0,
            props.value.length - token().length
        );
        props.onInput(`${before}${s.insert}${s.final ? ' ' : ''}`);
        setActive(0);
        if (s.final) setOpen(false);
        input?.focus();
    }

    function onKeyDown(e: KeyboardEvent) {
        const list = suggestions();
        if (e.key === 'Escape') {
            setOpen(false);
            return;
        }
        if (!shown()) {
            if (e.key === 'ArrowDown') setOpen(true);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => (i + 1) % list.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => (i - 1 + list.length) % list.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            const chosen = list[Math.min(active(), list.length - 1)];
            if (chosen && (e.key === 'Enter' || !chosen.final)) {
                e.preventDefault();
                pick(chosen);
            }
        }
    }

    return (
        <div class="packages-search-wrap" role="search">
            <div class="field field--compact packages-search">
                <AiOutlineSearch class="field-icon" aria-hidden="true" />
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
                    aria-controls={listId}
                    aria-activedescendant={
                        shown() ? `${listId}-${active()}` : undefined
                    }
                    placeholder={t(
                        'search_placeholder',
                        'Search packages, or tag:name'
                    )}
                    value={props.value}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setOpen(false)}
                    onInput={(e) => {
                        setOpen(true);
                        setActive(0);
                        props.onInput(e.currentTarget.value);
                    }}
                    onKeyDown={onKeyDown}
                />
                <Show when={props.value}>
                    <button
                        type="button"
                        class="packages-search-clear"
                        aria-label={t('search_clear', 'Clear the search')}
                        title={t('search_clear', 'Clear the search')}
                        onClick={() => {
                            props.onInput('');
                            input?.focus();
                        }}
                    >
                        <AiOutlineClose aria-hidden="true" />
                    </button>
                </Show>
            </div>
            <ul
                id={listId}
                role="listbox"
                class="packages-suggestions"
                hidden={!shown()}
                aria-label={t('search_hint.title', 'Filters')}
            >
                <For each={suggestions()}>
                    {(s, i) => (
                        <li
                            id={`${listId}-${i()}`}
                            role="option"
                            class="packages-suggestion"
                            aria-selected={i() === active()}
                            // Picked before the input's blur closes the list.
                            onMouseDown={(e) => {
                                e.preventDefault();
                                pick(s);
                            }}
                            onMouseEnter={() => setActive(i())}
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
