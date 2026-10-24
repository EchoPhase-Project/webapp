// The little markup policy texts use, so translators edit plain text.

export type Block =
    { kind: 'p'; text: string } | { kind: 'list'; items: string[] };

export type Inline = string | { text: string; href: string };

/** Paragraphs split by a blank line; a paragraph of "- " lines is a list. */
export function blocksOf(text: string): Block[] {
    return text
        .split(/\n\s*\n/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part): Block => {
            const lines = part.split('\n').map((l) => l.trim());
            return lines.every((l) => l.startsWith('- '))
                ? { kind: 'list', items: lines.map((l) => l.slice(2)) }
                : { kind: 'p', text: lines.join(' ') };
        });
}

const link = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Text with [text](href) links: site paths, #anchors, https and mailto. */
export function inlinesOf(text: string): Inline[] {
    const out: Inline[] = [];
    let last = 0;
    for (const match of text.matchAll(link)) {
        const [whole, label, href] = match;
        const safe = /^(\/|#|https:\/\/|mailto:)/.test(href);
        if (match.index > last) out.push(text.slice(last, match.index));
        out.push(safe ? { text: label, href } : label);
        last = match.index + whole.length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
}
