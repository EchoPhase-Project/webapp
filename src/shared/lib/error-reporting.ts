/** What the webapp reads at start: nginx's /config.json, from its environment. */
interface RuntimeConfig {
    sentryDsn?: string;
}

/** Same origin: nginx forwards the reports to GlitchTip (nginx.conf.template). */
export const ErrorsTunnel = '/errors';

const loadConfig = () => fetch('/config.json', { cache: 'no-store' });

/**
 * Reports the webapp's errors (uncaught ones and unhandled rejections) to
 * GlitchTip when the deployment has a DSN. The SDK is a chunk of its own,
 * loaded only then: without a DSN, or on the dev server (no /config.json),
 * nothing is loaded or sent. No personal data, no traces.
 */
export async function startErrorReporting(
    config: () => Promise<Response> = loadConfig
): Promise<boolean> {
    let settings: RuntimeConfig;
    try {
        const res = await config();
        if (!res.ok) return false;
        settings = (await res.json()) as RuntimeConfig;
    } catch {
        return false;
    }

    const dsn = settings.sentryDsn?.trim();
    if (!dsn) return false;

    const { startSentry } = await import('./sentry');
    startSentry(dsn, ErrorsTunnel);
    return true;
}
