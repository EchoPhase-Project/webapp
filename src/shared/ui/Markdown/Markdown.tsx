import { renderMarkdown } from '@shared/lib/markdown';
import './markdown.scss';

/** Markdown text, rendered safely (see renderMarkdown). */
export default function Markdown(props: { text: string; class?: string }) {
    return (
        <div
            class={['markdown', props.class].filter(Boolean).join(' ')}
            // Safe: markdown-it with html off escapes everything else.
            // eslint-disable-next-line solid/no-innerhtml
            innerHTML={renderMarkdown(props.text)}
        />
    );
}
