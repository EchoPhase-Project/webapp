import { createOutageWatch } from './outage';

export * from './outage';

// Looked up on each call, not captured at load: tests stub the global.
const platformFetch: typeof fetch = (input, init) =>
    globalThis.fetch(input, init);

const watch = createOutageWatch({
    fetch: platformFetch,
    setTimeout: (run, ms) => globalThis.setTimeout(run, ms),
    clearTimeout: (handle) =>
        globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
    reload: () => location.reload(),
    origin: location.origin,
});

/** The current outage, or null while the service is open. */
export const outage = watch.outage;

export const retryNow = watch.retryNow;

/**
 * fetch with the outage watch in front: the API client sends everything
 * through it, so an outage shows as one screen, not as each page failing.
 */
export const watchedFetch = watch.watch(platformFetch);
