import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

// The project's own config, on text given as if it were a file (one that
// exists: the type-aware rules need it in the project). The rules
// that keep the API layer and the session apart must stay on.
const eslint = new ESLint();

async function rulesBroken(code: string, filePath: string) {
    const [result] = await eslint.lintText(code, { filePath });
    const messages = result?.messages ?? [];
    // A file that does not parse breaks no rule: that would prove nothing.
    expect(messages.filter((m) => m.fatal)).toEqual([]);
    return messages.map((m) => m.ruleId);
}

const component = `import { api } from '@shared/api/client';
export const Notes = () => String(api.GET);
`;

const moduleSignal = `import { createSignal } from 'solid-js';
export const [open, setOpen] = createSignal(false);
`;

const bareButton = `export const Go = () => <button type="button">Go</button>;
`;

describe('the lint rules', { timeout: 60_000 }, () => {
    it('stop a component that calls the API', async () => {
        expect(
            await rulesBroken(component, 'src/features/notes/NotesPage.tsx')
        ).toContain('@typescript-eslint/no-restricted-imports');
    });

    it("let the feature's api.ts call it", async () => {
        expect(
            await rulesBroken(component, 'src/features/notes/api.ts')
        ).not.toContain('@typescript-eslint/no-restricted-imports');
    });

    it('stop a signal at the top of a feature module', async () => {
        expect(
            await rulesBroken(moduleSignal, 'src/features/notes/NotesPage.tsx')
        ).toContain('no-restricted-syntax');
    });

    it('let shared code keep one (no user state there)', async () => {
        expect(
            await rulesBroken(moduleSignal, 'src/shared/api/paged-list.ts')
        ).not.toContain('no-restricted-syntax');
    });
    it('stop a bare button in a feature', async () => {
        expect(
            await rulesBroken(bareButton, 'src/features/notes/NotesPage.tsx')
        ).toContain('no-restricted-syntax');
    });

    it('let the folders of shared/ui make the controls', async () => {
        for (const file of [
            'src/shared/ui/Button/Button.tsx',
            'src/shared/ui/forms/TextArea.tsx',
        ])
            expect(await rulesBroken(bareButton, file), file).not.toContain(
                'no-restricted-syntax'
            );
    });
});
