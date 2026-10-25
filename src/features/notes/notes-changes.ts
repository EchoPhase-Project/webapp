import { createSignal } from 'solid-js';

// Bumped whenever a note is saved or goes away outside the notes page (the
// quick note in the top bar), so an open list fetches again.
const [version, setVersion] = createSignal(0);

export const notesVersion = version;

export const notesChanged = () => setVersion((v) => v + 1);
