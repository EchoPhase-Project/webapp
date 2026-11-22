import { defineConfig, loadEnv, type PluginOption } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { compression } from 'vite-plugin-compression2';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'node:path';

// Where `vite` (dev) sends /api, the realtime gateway socket included.
const apiTarget = process.env.API_TARGET ?? 'http://localhost:8080';

export default defineConfig(({ command, mode }) => {
    // The developer aids (the /dev playground, the Query devtools, error
    // details): in the dev server, and in a build with VITE_DEV_TOOLS=true
    // (the dev cluster's `dev:deploy --dev-tools`). A literal in each module
    // that reads it, so a usual build drops the code and its chunks: an
    // exported constant would not (Rolldown keeps the chunks of dynamic
    // imports that only an imported false makes dead).
    const devTools =
        command === 'serve' ||
        loadEnv(mode, process.cwd(), 'VITE_').VITE_DEV_TOOLS === 'true';
    const plugins: PluginOption[] = [
        solidPlugin(),
        // .gz next to each asset for nginx's gzip_static, so it does not
        // compress on every request. Same threshold as its gzip_min_length.
        compression({
            algorithms: ['gzip'],
            threshold: 1024,
            logLevel: 'silent',
        }),
    ];

    if (mode === 'analyze')
        plugins.push(
            visualizer({
                filename: 'dist/bundle-analysis.html',
                open: true,
                gzipSize: true,
                brotliSize: true,
            })
        );

    return {
        plugins,
        define: {
            // The image tag the build was made as (the Docker build's
            // ECHOPHASE_VERSION): error reports name it as their release.
            __APP_VERSION__: JSON.stringify(
                process.env.ECHOPHASE_VERSION || '0.0.0-local'
            ),
            'import.meta.env.DEV_TOOLS': JSON.stringify(devTools),
        },
        resolve: {
            // The aliases (@app, @shared...) are tsconfig.json's paths.
            tsconfigPaths: true,
            // The dev server does not tree-shake: the package's "solid"
            // export, a barrel of 6,258 source modules, would reach the
            // browser module by module. Its prebuilt ESM file is one module
            // (as in vitest.config.ts). The build keeps the barrel, which
            // Rolldown tree-shakes.
            alias:
                command === 'serve'
                    ? [
                          {
                              find: /^@tabler\/icons-solidjs$/,
                              replacement: path.resolve(
                                  import.meta.dirname,
                                  'node_modules/@tabler/icons-solidjs/dist/esm/tabler-icons-solidjs.js'
                              ),
                          },
                      ]
                    : [],
        },
        css: {
            preprocessorOptions: {
                scss: {
                    // Sass does not see tsconfig's paths: it looks under src.
                    loadPaths: [path.resolve(import.meta.dirname, 'src')],
                    additionalData: [
                        `@use "shared/styles/variables" as vars;`,
                        `@use "shared/styles/media" as comp;`,
                        `@use "shared/styles/prefixes" as prefixes;`,
                        `@use "shared/styles/mixins" as mix;`,
                    ].join('\n'),
                },
            },
        },
        server: {
            port: 5173,
            strictPort: true,
            proxy: {
                // With the slash: /api-clients is a page, not the API.
                '/api/': { target: apiTarget, changeOrigin: true, ws: true },
            },
        },
        preview: {
            port: 4173,
            strictPort: true,
        },
        build: {
            target: 'esnext',
            sourcemap: mode === 'analyze',
            rollupOptions: {
                output: {
                    entryFileNames: 'js/[name].[hash].js',
                    chunkFileNames: 'js/[name].[hash].js',
                    assetFileNames: 'assets/[name].[hash].[ext]',
                },
            },
        },
    };
});
