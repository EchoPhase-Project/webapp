/** When the last reload for a stale build happened, per tab. */
const KEY = 'echophase:stale-build-reload';
/** A second failure this soon after reloading is not a stale build: let it show. */
const AGAIN_AFTER_MS = 10_000;

/**
 * A deploy replaced the build this tab started with: the page's lazily
 * loaded parts (other pages) are gone from the server, and opening one
 * fails. Vite says so with `vite:preloadError`; the page then reloads once
 * and gets the new build.
 */
export function reloadOnStaleBuild(
    reload: () => void = () => window.location.reload()
) {
    window.addEventListener('vite:preloadError', (event) => {
        let last = 0;
        try {
            last = Number(sessionStorage.getItem(KEY) ?? 0);
        } catch {
            // No storage (private mode, blocked): reload anyway.
        }
        if (Date.now() - last < AGAIN_AFTER_MS) return;
        try {
            sessionStorage.setItem(KEY, String(Date.now()));
        } catch {
            // As above.
        }
        event.preventDefault();
        reload();
    });
}
