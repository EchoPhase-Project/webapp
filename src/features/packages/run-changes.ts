import { createChangeSignal } from '@shared/lib/change-signal';

// Bumped when a run starts or ends anywhere (the realtime gateway's
// block_run events, wired in the layout), so an open run list fetches again.
const runs = createChangeSignal();

export const runsVersion = runs.version;

export const runsChanged = runs.changed;
