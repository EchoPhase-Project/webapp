import { runtimeConfig, type RuntimeConfig } from './runtime-config';

/** Where Umami is on this origin (nginx forwards /stats/ to it). */
export const StatsPath = '/stats';

// Umami's own switch: while set, its tracker sends nothing.
const DisabledKey = 'umami.disabled';

function setDisabled(disabled: boolean) {
    try {
        if (disabled) localStorage.setItem(DisabledKey, '1');
        else localStorage.removeItem(DisabledKey);
    } catch {
        // Storage blocked: the tracker cannot be switched off by it, but it
        // is only loaded once the visitor allowed it.
    }
}

const tracker = () =>
    document.head.querySelector(`script[src="${StatsPath}/script.js"]`);

/**
 * Visit statistics with Umami when the deployment has a website id and the
 * visitor allowed them (consent.ts): its tracker (no cookies; Do Not Track
 * respected) counts page views, client side route changes included. Without
 * an id no script is loaded.
 */
export async function startAnalytics(
    config: () => Promise<RuntimeConfig> = runtimeConfig
): Promise<boolean> {
    const websiteId = (await config()).umamiWebsiteId?.trim();
    if (!websiteId) return false;

    setDisabled(false);
    if (tracker()) return true;

    const script = document.createElement('script');
    script.defer = true;
    script.src = `${StatsPath}/script.js`;
    script.dataset.websiteId = websiteId;
    script.dataset.hostUrl = `${location.origin}${StatsPath}`;
    script.dataset.doNotTrack = 'true';
    document.head.append(script);
    return true;
}

/**
 * The visitor withdrew: the tracker, once loaded, cannot be unloaded, so it
 * is switched off by Umami's own flag; nothing is sent from now on.
 */
export function stopAnalytics(): void {
    setDisabled(true);
}
