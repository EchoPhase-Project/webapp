import { createSignal } from 'solid-js';

/**
 * Copies text to the clipboard and remembers what was copied last, for a
 * "Copied" note (`ui.copied`). `what` names it when one page copies several
 * things; it defaults to the text itself.
 */
export function createClipboard() {
    const [copied, setCopied] = createSignal<string | null>(null);

    /** False when there is no clipboard (insecure context, refused). */
    async function copy(text: string, what: string = text): Promise<boolean> {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(what);
            return true;
        } catch {
            return false;
        }
    }

    return { copied, copy };
}
