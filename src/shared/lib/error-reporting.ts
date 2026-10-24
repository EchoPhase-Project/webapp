import { runtimeConfig, type RuntimeConfig } from './runtime-config';

/** Same origin: nginx forwards the reports to GlitchTip (nginx.conf.template). */
export const ErrorsTunnel = '/errors';

/**
 * Reports the webapp's errors (uncaught ones and unhandled rejections) to
 * GlitchTip when the deployment has a DSN. The SDK is a chunk of its own,
 * loaded only then: without a DSN nothing is loaded or sent. No personal
 * data, no traces.
 */
export async function startErrorReporting(
    config: () => Promise<RuntimeConfig> = runtimeConfig
): Promise<boolean> {
    const dsn = (await config()).sentryDsn?.trim();
    if (!dsn) return false;

    const { startSentry } = await import('./sentry');
    startSentry(dsn, ErrorsTunnel);
    return true;
}
