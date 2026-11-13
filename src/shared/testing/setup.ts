import { afterEach } from 'vitest';

// Every test file runs this first (vitest.config.ts, setupFiles). A component
// test (jsdom) unmounts what it rendered after each test; a plain logic test
// does not load the DOM library at all.
if (typeof document !== 'undefined') {
    const { cleanup } = await import('@solidjs/testing-library');
    afterEach(cleanup);
}
