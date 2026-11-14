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
// Every icon comes from one module, so the app keeps one set and one name
// for each meaning; src/shared/ui/icons.ts alone imports the libraries.
const iconLibraries = layer(
    'Icons come from @shared/ui/icons.',
    'solid-icons',
    'solid-icons/*',
    '@tabler/icons-solidjs',
    '@tabler/icons-solidjs/*'
);
// Controls come from src/shared/ui (Button, HeaderButton, Tabs, Checkbox,
// RadioGroup, Select, TextArea), so they keep one look and one keyboard
// behaviour, and their errors show the same way. A clickable card or row
// elsewhere disables the rule on its line, with why.
const ownControls = [
    {
        selector: 'JSXOpeningElement[name.name="button"]',
        message:
            'Use Button (or HeaderButton, Tabs) from @shared/ui; a clickable card or row needs a reason: eslint-disable-next-line with it.',
    },
    {
        selector:
            'JSXOpeningElement[name.name="input"]:has(JSXAttribute[name.name="type"][value.value=/^(checkbox|radio)$/])',
        message:
            'Use Checkbox or RadioGroup (or Switch, for a setting saved at once) from @shared/ui.',
    },
    {
        selector: 'JSXOpeningElement[name.name="select"]',
        message: 'Use Select from @shared/ui.',
    },
    {
        selector: 'JSXOpeningElement[name.name="textarea"]',
        message: 'Use TextArea (or MarkdownEditor) from @shared/ui.',
    },
];
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
            // createSubmit's run(), runFor() and pending() call their functions at
            // once, from the event handler that called them.
            'solid/reactivity': [
                'error',
                { customReactiveFunctions: ['run', 'runFor', 'pending'] },
            ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            'no-restricted-imports': [
                'error',
                { patterns: [noParent, iconLibraries] },
            ],
            'no-restricted-syntax': ['error', ...ownControls],
        },
    },

    {
        // Where the controls are made, the navigation's own system, and
        // tests that render bare markup.
        files: [
            'src/shared/ui/**',
            'src/shared/nav/**',
            'src/**/*.test.{ts,tsx}',
        ],
        rules: { 'no-restricted-syntax': 'off' },
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
                        iconLibraries,
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
                        iconLibraries,
                        layer(
                            'A feature uses shared code and itself; move what two features need to src/shared.',
                            '@app/*',
                            '@dev/*',
                            // Files, not folders: a folder left out cannot
                            // be let back in (gitignore rules).
                            '@features/*/**',
                            `!@features/${feature}/**`
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
                        iconLibraries,
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

    {
        // The one module that imports the icon libraries.
        files: ['src/shared/ui/icons.ts'],
        rules: {
            'no-restricted-imports': ['error', { patterns: [noParent] }],
        },
    },
]);
