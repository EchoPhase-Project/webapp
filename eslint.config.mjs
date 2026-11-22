import fs from 'node:fs';
import path from 'node:path';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import solid from 'eslint-plugin-solid/configs/typescript';
import query from '@tanstack/eslint-plugin-query';
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
// Only the API layer calls the API: a feature's api.ts or api/<entity>.ts
// describes its queries and mutations, components use those descriptions.
// Then each key, cache update and staleTime has one place.
const apiLayer = {
    regex: '^(@shared/api/|\\./)client$',
    importNames: ['api', 'request'],
    allowTypeImports: true,
    message:
        "Call the API in the feature's api.ts (or api/<entity>.ts) and use its …Query and …Mutation descriptions here.",
};
// What a user sees lives in the session's QueryClient or under the
// SessionProvider: a module-level signal or store would outlive the session
// and show one user's data to the next.
const moduleState = ['createSignal', 'createStore'].map((name) => ({
    selector: `:matches(Program, Program > ExportNamedDeclaration) > VariableDeclaration > VariableDeclarator > CallExpression.init[callee.name="${name}"]`,
    message: `No ${name} at the top of a feature module: keep user state in Query, in a component, or in sessionScoped from @shared/api/session-provider.`,
}));
// One switch for the developer aids (the /dev playground, the Query
// devtools, error details): import.meta.env.DEV_TOOLS, which vite.config.ts
// defines. DEV leaves them out of a dev cluster's build with VITE_DEV_TOOLS.
const devTools = {
    selector:
        'MemberExpression[object.object.type="MetaProperty"][object.property.name="env"][property.name=/^(DEV|VITE_DEV_TOOLS)$/]',
    message:
        'Put a developer aid behind import.meta.env.DEV_TOOLS (the dev server, or a build with VITE_DEV_TOOLS=true).',
};
const features = fs.readdirSync(path.join(import.meta.dirname, 'src/features'));

export default defineConfig([
    { ignores: ['src/shared/api/schema.d.ts'] },

    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    solid,
    // TanStack Query's own rules: stable clients, complete query keys, the
    // order of the options that type inference depends on.
    ...query.configs['flat/recommended'],

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
            // once, from the event handler that called them; createForm's
            // onSubmit(send) calls send from the submit handler it makes.
            'solid/reactivity': [
                'error',
                {
                    customReactiveFunctions: [
                        'run',
                        'runFor',
                        'pending',
                        'onSubmit',
                    ],
                },
            ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            'no-restricted-imports': [
                'error',
                { patterns: [noParent, iconLibraries] },
            ],
            'no-restricted-syntax': ['error', ...ownControls, devTools],
            '@typescript-eslint/no-restricted-imports': [
                'error',
                { patterns: [apiLayer] },
            ],
        },
    },

    {
        files: ['src/features/**'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...ownControls,
                ...moduleState,
                devTools,
            ],
        },
    },

    {
        // The API layer: the features' descriptions, the session and the
        // user (auth.ts, session-provider.tsx), and tests that call the API
        // as a page would.
        files: [
            'src/features/*/api.ts',
            'src/features/*/api/*.ts',
            'src/shared/api/auth.ts',
            'src/shared/api/session-provider.tsx',
            'src/**/*.test.{ts,tsx}',
        ],
        rules: { '@typescript-eslint/no-restricted-imports': 'off' },
    },

    {
        // Where the controls are made, the navigation's own system, and
        // tests that render bare markup.
        files: [
            'src/shared/ui/**',
            'src/shared/nav/**',
            'src/**/*.test.{ts,tsx}',
        ],
        rules: { 'no-restricted-syntax': ['error', devTools] },
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
