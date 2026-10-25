import MarkdownIt from 'markdown-it';

// Raw HTML is shown as text, not run: notes come from users (and workflows).
// markdown-it also refuses javascript:, vbscript:, file: and most data: links.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

// Links leave the app in a new tab, without telling the other site where from.
const defaultLinkOpen =
    md.renderer.rules.link_open ??
    ((tokens, idx, options, _env, self) =>
        self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = String(tokens[idx].attrGet('href') ?? '');
    if (!href.startsWith('/') && !href.startsWith('#')) {
        tokens[idx].attrSet('target', '_blank');
        tokens[idx].attrSet('rel', 'noopener noreferrer nofollow');
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
};

/** Markdown as safe HTML: no raw HTML, no script links, line breaks kept. */
export function renderMarkdown(text: string): string {
    return md.render(text);
}

/** The text without its Markdown: for a card's preview line. */
export function plainText(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
        .replace(/[*_~`]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
