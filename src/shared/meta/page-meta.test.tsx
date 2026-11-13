// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { RootMetaContext, usePageMeta, type PageMeta } from './page-meta';

describe('usePageMeta', () => {
    it('adds the site name, follows the page and waits while it has none', () => {
        const setTitle = vi.fn();
        const setDescription = vi.fn();
        const [meta, setMeta] = createSignal<PageMeta | undefined>();
        function Page() {
            usePageMeta(meta);
            return null;
        }
        render(() => (
            <RootMetaContext.Provider value={{ setTitle, setDescription }}>
                <Page />
            </RootMetaContext.Provider>
        ));
        expect(setTitle).not.toHaveBeenCalled();

        setMeta({ title: 'Files', description: 'Your files.' });
        expect(setTitle).toHaveBeenLastCalledWith('Files · EchoPhase');
        expect(setDescription).toHaveBeenLastCalledWith('Your files.');
    });
});
