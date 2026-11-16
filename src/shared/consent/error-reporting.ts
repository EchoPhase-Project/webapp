import { runtimeConfig, type RuntimeConfig } from './runtime-config';

/** Same origin: nginx forwards the reports to GlitchTip (nginx.conf.template). */
export const ErrorsTunnel = '/errors';

let running = false;

/**
 * Reports the webapp's errors (uncaught ones and unhandled rejections) to
 * GlitchTip when the deployment has a DSN and the visitor allowed it
 * (consent.ts). The SDK is a chunk of its own, loaded only then: without a
 * DSN nothing is loaded or sent. No personal data, no traces.
 */
export async function startErrorReporting(
    config: () => Promise<RuntimeConfig> = runtimeConfig
): Promise<boolean> {
    const dsn = (await config()).sentryDsn?.trim();
    if (!dsn) return false;

    if (running) return true;
    const { startSentry } = await import('./sentry');
    startSentry(dsn, ErrorsTunnel);
    running = true;
    return true;
}

/** The visitor withdrew: the SDK stops and sends nothing more. */
export async function stopErrorReporting(): Promise<void> {
    if (!running) return;
    running = false;
    const { stopSentry } = await import('./sentry');
    stopSentry();
}

const reported = new WeakSet<object>();

/**
 * Reports an error that the app caught itself (a page that threw, caught by
 * PageErrorBoundary), so it never reaches the SDK's global handlers. Only
 * while reporting runs (the visitor allowed it); each error object once.
 */
export async function reportError(error: unknown): Promise<void> {
    if (!running) return;
    if (typeof error === 'object' && error !== null) {
        if (reported.has(error)) return;
        reported.add(error);
    }
    const { reportToSentry } = await import('./sentry');
    reportToSentry(error);
}
