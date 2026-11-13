import { createSignal } from 'solid-js';

/**
 * A count bumped when something changes elsewhere: what reads `version` in
 * a resource's source or an effect fetches again after each `changed()`.
 */
export function createChangeSignal() {
    const [version, setVersion] = createSignal(0);
    const changed = () => {
        setVersion((v) => v + 1);
    };
    return { version, changed };
}
