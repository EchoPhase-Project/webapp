import { createSignal } from 'solid-js';

// Bumped when a run starts or ends anywhere (the realtime gateway's
// block_run events, wired in the layout), so an open run list fetches again.
const [version, setVersion] = createSignal(0);

export const runsVersion = version;

export const runsChanged = () => setVersion((v) => v + 1);
