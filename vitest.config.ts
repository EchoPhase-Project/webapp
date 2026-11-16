import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';

// Separate from vite.config.ts: compression and the bundle report have no
// place in a test run.
export default defineConfig({
    // As vite.config.ts defines them for a usual build.
    define: {
        __APP_VERSION__: JSON.stringify('0.0.0-local'),
        'import.meta.env.DEV_TOOLS': 'false',
    },
    plugins: [solidPlugin()],
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        // Plain logic by default; vite-plugin-solid would otherwise ask for
        // jsdom. A component test opts in with `// @vitest-environment jsdom`.
        environment: 'node',
        include: ['src/**/*.test.{ts,tsx}'],
        // After each test: unmount what it rendered (the setup file) and put
        // back the globals it stubbed (fakeApi stubs fetch).
        setupFiles: ['src/shared/testing/setup.ts'],
        unstubGlobals: true,
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
                'src/**/fixtures.ts',
            ],
            reporter: ['text-summary', 'lcov', 'html'],
            reportsDirectory: 'artifacts/coverage',
        },
    },
});
