import { createContext, createRenderEffect, useContext } from 'solid-js';

export interface RootMetaContextValue {
    setTitle: (title: string) => void;
    setDescription: (description: string) => void;
}

export const RootMetaContext = createContext<RootMetaContextValue>();

export function useRootMeta() {
    const ctx = useContext(RootMetaContext);
    if (!ctx) {
        throw new Error('useRootMeta must be used inside <Root>');
    }
    return ctx;
}

/** What a page tells the browser and search engines about itself. */
export interface PageMeta {
    /** The page's own name; the site name is added after it. */
    title: string;
    description: string;
}

/**
 * Keeps the document title ("<title> · EchoPhase") and description in step
 * with the page. While `meta` gives nothing (the page is still loading), the
 * previous ones stay.
 */
export function usePageMeta(meta: () => PageMeta | undefined): void {
    const { setTitle, setDescription } = useRootMeta();
    createRenderEffect(() => {
        const current = meta();
        if (!current) return;
        setTitle(`${current.title} · EchoPhase`);
        setDescription(current.description);
    });
}
