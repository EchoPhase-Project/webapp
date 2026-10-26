// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { reloadOnStaleBuild } from './stale-build';

describe('reloadOnStaleBuild', () => {
    afterEach(() => sessionStorage.clear());

    it('reloads once when a part of the old build is gone, not again right after', () => {
        const reload = vi.fn();
        reloadOnStaleBuild(reload);

        const first = new Event('vite:preloadError', { cancelable: true });
        window.dispatchEvent(first);
        expect(reload).toHaveBeenCalledOnce();
        expect(first.defaultPrevented).toBe(true);

        // The reload brought the same failure: it is not a stale build.
        const second = new Event('vite:preloadError', { cancelable: true });
        window.dispatchEvent(second);
        expect(reload).toHaveBeenCalledOnce();
        expect(second.defaultPrevented).toBe(false);
    });
});
