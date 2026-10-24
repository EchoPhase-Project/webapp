import { defineConfig, type PluginOption } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { compression } from 'vite-plugin-compression2';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'node:path';

// Where `vite` (dev) sends /api, the realtime gateway socket included.
const apiTarget = process.env.API_TARGET ?? 'http://localhost:8080';

export default defineConfig(({ mode }) => {
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
        resolve: {
            // The aliases (@app, @shared...) are tsconfig.json's paths.
            tsconfigPaths: true,
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
                    ].join('\n'),
                },
            },
        },
        server: {
            port: 5173,
            strictPort: true,
            proxy: {
                '/api': { target: apiTarget, changeOrigin: true, ws: true },
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
