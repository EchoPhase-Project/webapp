import { describe, expect, it } from 'vitest';

// Read as text: what the feature's pages, components and hooks import.
const sources = import.meta.glob<string>(
    [
        '/src/features/packages/**/*.{ts,tsx}',
        '!/src/features/packages/api/**',
        '!/src/features/packages/**/*.test.{ts,tsx}',
    ],
    { query: '?raw', import: 'default', eager: true }
);

describe('the packages feature', () => {
    it('calls the API only in api/: no api or request elsewhere', () => {
        const files = Object.keys(sources);
        expect(files).toContain('/src/features/packages/package-nav.ts');
        expect(files).toContain(
            '/src/features/packages/components/PackageDetails.tsx'
        );
        for (const [file, source] of Object.entries(sources))
            expect(source, file).not.toMatch(
                /import\s*\{[^}]*\b(api|request)\b[^}]*\}\s*from\s*'@shared\/api\/client'/
            );
    });
});
