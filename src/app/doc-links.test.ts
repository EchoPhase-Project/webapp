import { describe, expect, it } from 'vitest';

// The rules for persons and agents, as text: a link in them to a file or a
// heading that is not there fails the test.
const docs = import.meta.glob<string>(
    ['/CONTRIBUTING.md', '/AGENTS.md', '/README.md', '/docs/**/*.md'],
    { query: '?raw', import: 'default', eager: true }
);

// Every file of the repository, by its path from the root: only the names
// (nothing is loaded), so a link can point at code or a folder too.
const files = Object.keys(
    import.meta.glob([
        '/**/*',
        '/.github/**/*',
        '!/node_modules/**',
        '!/dist/**',
        '!/artifacts/**',
    ])
);

/**
 * The anchor GitHub gives a heading: lower case, spaces to dashes. An
 * underscore stays (GitHub keeps it); backticks and asterisks go.
 */
export function slug(heading: string): string {
    return heading
        .trim()
        .toLowerCase()
        .replace(/[`*]/g, '')
        .replace(/[^\p{L}\p{N}_\- ]/gu, '')
        .replace(/ /g, '-');
}

export function anchorsOf(text: string): Set<string> {
    const anchors = new Set<string>();
    // A repeated heading gets -1, -2, … on GitHub.
    const seen = new Map<string, number>();
    let fenced = false;
    for (const line of text.split('\n')) {
        if (line.startsWith('```')) fenced = !fenced;
        const heading = fenced ? null : /^#{1,6} (.+)$/.exec(line);
        if (!heading?.[1]) continue;
        const base = slug(heading[1]);
        const n = seen.get(base) ?? 0;
        seen.set(base, n + 1);
        anchors.add(n === 0 ? base : `${base}-${n}`);
    }
    return anchors;
}

/** The [text](target) links outside code, but not to other sites. */
function linksOf(text: string): string[] {
    const prose = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    return [...prose.matchAll(/\]\(([^)\s]+)\)/g)]
        .map((m) => m[1] ?? '')
        .filter((target) => !/^[a-z][a-z\d+.-]*:/i.test(target));
}

/** `target` from the file `from`, as a path from the root. */
function resolve(from: string, target: string): string {
    const parts = from.split('/').slice(0, -1);
    for (const part of target.split('/')) {
        if (part === '..') parts.pop();
        else if (part && part !== '.') parts.push(part);
    }
    return '/' + parts.filter(Boolean).join('/');
}

const exists = (path: string) =>
    files.includes(path) ||
    files.some((file) => file.startsWith(path.replace(/\/$/, '') + '/'));

describe('the links in the docs', () => {
    it('finds the docs', () => {
        expect(Object.keys(docs)).toContain('/CONTRIBUTING.md');
        expect(
            Object.keys(docs).filter((d) => d.startsWith('/docs/contributing/'))
                .length
        ).toBeGreaterThan(5);
    });

    it('go to files and headings that are there', () => {
        const broken: string[] = [];
        for (const [file, text] of Object.entries(docs)) {
            for (const link of linksOf(text)) {
                const [path = '', anchor] = link.split('#');
                const target = path ? resolve(file, path) : file;
                if (!exists(target)) {
                    broken.push(`${file}: ${link} (no ${target})`);
                    continue;
                }
                if (anchor && target.endsWith('.md')) {
                    const other = docs[target];
                    if (other !== undefined && !anchorsOf(other).has(anchor))
                        broken.push(`${file}: ${link} (no heading #${anchor})`);
                }
            }
        }
        expect(broken).toEqual([]);
    });

    it('make the anchors as GitHub does', () => {
        expect(slug('a11y (accessibility)')).toBe('a11y-accessibility');
        expect(slug('The API layer of a feature')).toBe(
            'the-api-layer-of-a-feature'
        );
        expect(slug('`CardGrid` and Masonry')).toBe('cardgrid-and-masonry');
        expect(slug('`Member_Condition_Outcome`')).toBe(
            'member_condition_outcome'
        );
        expect([
            ...anchorsOf('# Example\n## Example\n```\n# Not\n```'),
        ]).toEqual(['example', 'example-1']);
    });
});
