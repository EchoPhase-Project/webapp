import fs from 'node:fs';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import solid from 'eslint-plugin-solid/configs/typescript';
import { defineConfig } from 'eslint/config';

// Who may import whom: app wires everything; a feature uses shared code and
// itself, never another feature; shared code knows no feature. Paths go
// through the aliases (@app, @features, @shared, @dev), or ./ in one folder.
const layer = (message, ...group) => ({ group, message });
const noParent = layer(
    'Import through an alias (@shared/..., @features/...), not ../',
    '../*'
);
const features = fs.readdirSync('src/features');

export default defineConfig([
    { ignores: ['src/shared/api/schema.d.ts'] },

    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    solid,

    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            globals: globals.browser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // TypeScript checks undefined names itself; the core rule does not
            // know types such as EventListener (typescript-eslint's advice).
            'no-undef': 'off',
            'solid/reactivity': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            'no-restricted-imports': ['error', { patterns: [noParent] }],
        },
    },

    {
        // `let el; <div ref={el} />`: Solid's compiler assigns refs, which
        // ESLint 10's no-unassigned-vars cannot see.
        files: ['src/**/*.tsx'],
        rules: { 'no-unassigned-vars': 'off' },
    },

    {
        files: ['src/shared/**'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        noParent,
                        layer(
                            'Shared code cannot depend on app, features or dev pages.',
                            '@app/*',
                            '@features/*',
                            '@dev/*'
                        ),
                    ],
                },
            ],
        },
    },

    ...features.map((feature) => ({
        files: [`src/features/${feature}/**`],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        noParent,
                        layer(
                            'A feature uses shared code and itself; move what two features need to src/shared.',
                            '@app/*',
                            '@dev/*',
                            '@features/*',
                            `!@features/${feature}/*`
                        ),
                    ],
                },
            ],
        },
    })),

    {
        files: ['src/dev/**'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        noParent,
                        layer(
                            'Dev pages try out shared code only.',
                            '@app/*',
                            '@features/*'
                        ),
                    ],
                },
            ],
        },
    },

    {
        // Tests stub and poke at things on purpose.
        files: ['src/**/*.test.{ts,tsx}'],
        rules: {
            '@typescript-eslint/unbound-method': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
        },
    },
]);
