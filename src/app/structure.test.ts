// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

// The API layer of each feature: api.ts, or api/<entity>.ts.
const apiModules = import.meta.glob<Record<string, unknown>>(
    [
        '/src/features/*/api.ts',
        '/src/features/*/api/*.ts',
        '!/src/features/**/*.test.ts',
    ],
    { eager: true }
);

// What else an API module may export, by file: a value its descriptions
// and the components share. Keep it short; a new entry needs a reason.
const helpers: Record<string, readonly string[]> = {
    // The download address of a file (no request: an <a href>).
    '/src/features/files/api.ts': ['contentUrl', 'PAGE_SIZE'],
    // The bell merges realtime events into the inbox page.
    '/src/features/notifications/api.ts': ['INBOX_SIZE', 'withNotification'],
    // The run lists, as realtime events and a new run change them.
    '/src/features/packages/api/runs.ts': [
        'runId',
        'refreshRunLists',
        'patchRunLists',
    ],
    // The export address (no request: an <a href download>).
    '/src/features/packages/api/workflows.ts': ['workflowExportUrl'],
};

const Description = /^\w+(Keys|Query|InfiniteQuery|Mutation)$/;

// Every source file as text, this one left out (it names what it bans).
const sources = import.meta.glob<string>(
    [
        '/src/**/*.{ts,tsx}',
        '!/src/app/structure.test.ts',
        '!/src/shared/api/schema.d.ts',
    ],
    { query: '?raw', import: 'default', eager: true }
);

// Transitional code of the move to TanStack Query: gone, and stays gone.
const leftovers: [string, RegExp][] = [
    ['send(api.…)', /\bsend\(\s*api\./],
    ['ApiResult', /\bApiResult\b/],
    ['dataOr', /\bdataOr\b/],
    ['createChangeSignal', /\bcreateChangeSignal\b/],
    ['run-changes', /run-changes/],
    ['notes-changes', /notes-changes/],
    ['AuthProvider', /\bAuthProvider\b/],
];

// Static documents that the i18n context and two pages load: not API data.
const resources = new Set([
    '/src/shared/i18n/i18n-context.tsx',
    '/src/features/legal/LegalDocument.tsx',
    '/src/features/docs/DocsPage.tsx',
]);

describe('the API layer', () => {
    it('finds the API modules', () => {
        expect(Object.keys(apiModules)).toContain('/src/features/notes/api.ts');
        expect(Object.keys(apiModules)).toContain(
            '/src/features/packages/api/runs.ts'
        );
    });

    it('exports only descriptions, and the listed helpers', () => {
        for (const [file, module] of Object.entries(apiModules)) {
            const allowed = helpers[file] ?? [];
            const extra = Object.keys(module).filter(
                (name) => !Description.test(name) && !allowed.includes(name)
            );
            expect(extra, file).toEqual([]);
        }
    });

    it('keeps the helper list current', () => {
        for (const [file, names] of Object.entries(helpers))
            for (const name of names)
                expect(apiModules[file], file).toHaveProperty(name);
    });
});

describe('the source', () => {
    it('has no transitional API code', () => {
        expect(Object.keys(sources).length).toBeGreaterThan(100);
        for (const [file, source] of Object.entries(sources))
            for (const [name, pattern] of leftovers)
                expect(pattern.test(source), `${name} in ${file}`).toBe(false);
    });

    it('has no <Suspense>: data shows its load with isPending', () => {
        // A query's data would suspend the page (PageLoading/query-suspense.test.tsx).
        const users = Object.entries(sources)
            .filter(([, source]) =>
                /import\s*{[^}]*\bSuspense\b[^}]*}\s*from\s*'solid-js'/.test(
                    source
                )
            )
            .map(([file]) => file);
        expect(users).toEqual(['/src/app/PageLoading/query-suspense.test.tsx']);
    });

    it('loads the pages with lazyPage', () => {
        const pages = sources['/src/app/pages.ts'] ?? '';
        expect(pages).toContain('lazyPage(');
        expect(/\blazy\(/.test(pages)).toBe(false);
    });

    it('has createResource only for static documents', () => {
        const users = Object.entries(sources)
            .filter(([, source]) => /\bcreateResource\b/.test(source))
            .map(([file]) => file);
        expect(users.sort()).toEqual([...resources].sort());
    });
});
