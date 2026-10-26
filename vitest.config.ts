import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';

// Separate from vite.config.ts: compression and the bundle report have no
// place in a test run.
export default defineConfig({
    // As vite.config.ts defines it for a build without ECHOPHASE_VERSION.
    define: { __APP_VERSION__: JSON.stringify('0.0.0-local') },
    plugins: [solidPlugin()],
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        // Plain logic by default; vite-plugin-solid would otherwise ask for
        // jsdom. A component test opts in with `// @vitest-environment jsdom`.
        environment: 'node',
        include: ['src/**/*.test.{ts,tsx}'],
        // Stylesheets come out empty in tests, ?raw too; the palette test
        // reads the colour tokens.
        css: { include: [/tokens\.scss/] },
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.test.{ts,tsx}',
                'src/**/*.d.ts',
                'src/dev/**',
                'src/shared/testing/**',
            ],
            reporter: ['text-summary', 'lcov', 'html'],
            reportsDirectory: 'artifacts/coverage',
        },
    },
});
