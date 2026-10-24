import { createEffect, createRoot, on } from 'solid-js';
import { granted, type Consent } from './consent';
import { startAnalytics, stopAnalytics } from './analytics';
import { startErrorReporting, stopErrorReporting } from './error-reporting';

type Switch = { start: () => Promise<unknown>; stop: () => unknown };

const services: Record<keyof Consent, Switch> = {
    analytics: { start: startAnalytics, stop: stopAnalytics },
    errors: { start: startErrorReporting, stop: stopErrorReporting },
};

/**
 * Keeps the optional services in step with the visitor's choice: each
 * starts once allowed and stops when the permission is withdrawn. Nothing
 * runs before a choice. Each is still a no-op unless the deployment
 * switches it on (/config.json).
 */
export function followConsent(): () => void {
    return createRoot((dispose) => {
        createEffect(
            on(granted, (now, before) => {
                for (const key of Object.keys(services) as (keyof Consent)[]) {
                    if (now[key] === (before?.[key] ?? false)) continue;
                    if (now[key]) void services[key].start();
                    else void services[key].stop();
                }
            })
        );
        return dispose;
    });
}
