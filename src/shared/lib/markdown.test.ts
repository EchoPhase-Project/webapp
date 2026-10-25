import { describe, expect, it } from 'vitest';
import { plainText, renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
    it('renders the usual Markdown', () => {
        const html = renderMarkdown('# Title\n\n- **one**\n- `two`');
        expect(html).toContain('<h1>Title</h1>');
        expect(html).toContain('<strong>one</strong>');
        expect(html).toContain('<code>two</code>');
    });

    it('shows raw HTML as text', () => {
        const html = renderMarkdown(
            '<img src=x onerror="alert(1)"><script>x</script>'
        );
        expect(html).not.toContain('<img');
        expect(html).not.toContain('<script');
        expect(html).toContain('&lt;script&gt;');
    });

    it('drops script links and opens others in a new tab', () => {
        expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain(
            'href'
        );
        const external = renderMarkdown('[site](https://example.com)');
        expect(external).toContain('target="_blank"');
        expect(external).toContain('rel="noopener noreferrer nofollow"');
        expect(renderMarkdown('[files](/files)')).not.toContain('_blank');
    });
});

describe('plainText', () => {
    it('strips the marks', () => {
        expect(plainText('## Plan\n- **milk** and [bread](https://x)')).toBe(
            'Plan milk and bread'
        );
    });
});
