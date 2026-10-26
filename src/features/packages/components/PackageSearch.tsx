import { Show } from 'solid-js';
import { AiOutlineClose, AiOutlineSearch } from 'solid-icons/ai';
import { useLocalizer } from '@shared/i18n/i18n-context';

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

/**
 * One search line, as on GitHub: words, and qualifiers in the same text
 * (`tag:discord-bot`); a cross clears it.
 */
export default function PackageSearch(props: {
    value: string;
    onInput: (value: string) => void;
}) {
    const t = useLocalizer('packages');
    let input: HTMLInputElement | undefined;

    return (
        <div class="field field--compact packages-search" role="search">
            <AiOutlineSearch class="field-icon" aria-hidden="true" />
            <label class="visually-hidden" for="packages-search">
                {t('search', 'Search packages')}
            </label>
            <input
                ref={input}
                id="packages-search"
                name="q"
                type="text"
                class="field-input"
                autocomplete="off"
                spellcheck={false}
                placeholder={t(
                    'search_placeholder',
                    'Search packages, or tag:name'
                )}
                value={props.value}
                onInput={(e) => props.onInput(e.currentTarget.value)}
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
    );
}
