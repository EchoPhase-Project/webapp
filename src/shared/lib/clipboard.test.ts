import { describe, expect, it, vi } from 'vitest';
import { createClipboard } from './clipboard';

const stubClipboard = (writeText: (text: string) => Promise<void>) =>
    vi.stubGlobal('navigator', { clipboard: { writeText } });

describe('createClipboard', () => {
    it('copies, and remembers what was copied last', async () => {
        const writeText = vi.fn(() => Promise.resolve());
        stubClipboard(writeText);
        const clipboard = createClipboard();
        expect(clipboard.copied()).toBeNull();

        expect(await clipboard.copy('https://x/hook', 'url1')).toBe(true);
        expect(writeText).toHaveBeenCalledWith('https://x/hook');
        expect(clipboard.copied()).toBe('url1');

        await clipboard.copy('s3cret');
        expect(clipboard.copied()).toBe('s3cret');
    });

    it('answers false, and keeps the state, without a clipboard', async () => {
        stubClipboard(() => Promise.reject(new Error('insecure')));
        const clipboard = createClipboard();

        expect(await clipboard.copy('text')).toBe(false);
        expect(clipboard.copied()).toBeNull();
    });
});
