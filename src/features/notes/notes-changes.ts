import { createChangeSignal } from '@shared/lib/change-signal';

// Bumped whenever a note is saved or goes away outside the notes page (the
// quick note in the top bar), so an open list fetches again.
const notes = createChangeSignal();

export const notesVersion = notes.version;

export const notesChanged = notes.changed;
