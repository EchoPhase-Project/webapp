import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';
import path from 'path';

// Separate from vite.config.ts: the build's plugins (lib index generation,
// formatting, compression, sitemap) have no place in a test run.
const src = (...p: string[]) => path.resolve(import.meta.dirname, 'src', ...p);

export default defineConfig({
    plugins: [solidPlugin()],
    resolve: {
        alias: {
            '@': src(),
            '@lib': src('lib'),
            '@forms': src('forms'),
            '@styles': src('styles'),
            '@static': src('static'),
            '@components': src('components'),
        },
    },
    test: {
        // Plain logic by default; vite-plugin-solid would otherwise ask for
        // jsdom. A component test opts in with `// @vitest-environment jsdom`.
        environment: 'node',
        include: ['src/**/*.test.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts'],
            reporter: ['text-summary', 'lcov'],
            reportsDirectory: 'artifacts/coverage',
        },
    },
});
