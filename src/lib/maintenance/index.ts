import { createOutageWatch } from './outage';

export * from './outage';

const original = globalThis.fetch.bind(globalThis);

const watch = createOutageWatch({
    fetch: original,
    setTimeout: (run, ms) => globalThis.setTimeout(run, ms),
    clearTimeout: (handle) =>
        globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
    reload: () => location.reload(),
    origin: location.origin,
});

/** The current outage, or null while the service is open. */
export const outage = watch.outage;

export const retryNow = watch.retryNow;

let installed = false;

/**
 * Puts the watch in front of fetch, once, before the app makes its first
 * call: every provider and page keeps calling fetch as it does.
 */
export function watchApi() {
    if (installed) return;
    installed = true;
    globalThis.fetch = watch.watch(original);
}
