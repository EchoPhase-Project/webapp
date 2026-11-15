import { close, init } from '@sentry/browser';
import { API_VERSION, APP_VERSION } from './build-info';

// Imported lazily by error-reporting.ts. Named imports, so the bundle keeps
// what init needs, not all of @sentry/browser (replay, feedback...).
export function startSentry(dsn: string, tunnel: string) {
    // GlitchTip authenticates by the key in the URL (or a header), not by the
    // DSN inside the report, which is all a tunnelled request carries.
    const key = encodeURIComponent(new URL(dsn).username);
    init({
        dsn,
        tunnel: `${tunnel}?sentry_key=${key}`,
        environment: location.hostname,
        // Which build broke, and for which contract it was made.
        release: APP_VERSION,
        initialScope: { tags: { api: API_VERSION } },
        sendDefaultPii: false,
        tracesSampleRate: 0,
    });
}

export function stopSentry() {
    void close();
}
