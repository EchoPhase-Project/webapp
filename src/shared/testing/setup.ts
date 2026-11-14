import { afterEach } from 'vitest';

// Every test file runs this first (vitest.config.ts, setupFiles). A component
// test (jsdom) unmounts what it rendered after each test; a plain logic test
// does not load the DOM library at all.
if (typeof document !== 'undefined') {
    const { cleanup } = await import('@solidjs/testing-library');
    afterEach(cleanup);
}

// Node's BroadcastChannel reaches the other test files' workers: a sign-out
// in one would sign out another. The session module gets its stub instead,
// and a test that plays two tabs takes the pair from resetSession.
Reflect.deleteProperty(globalThis, 'BroadcastChannel');
