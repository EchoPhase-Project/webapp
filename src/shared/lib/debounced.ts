import { onCleanup } from 'solid-js';

/**
 * Runs the last function given once `ms` pass without a newer one: a search
 * that waits for a pause in typing. `cancel` drops the waiting one.
 */
export function createDebounced(ms: number) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancel = () => clearTimeout(timer);
    const debounce = (run: () => void) => {
        cancel();
        timer = setTimeout(run, ms);
    };
    onCleanup(cancel);
    return Object.assign(debounce, { cancel });
}
