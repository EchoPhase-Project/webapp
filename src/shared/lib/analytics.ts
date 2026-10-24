import { runtimeConfig, type RuntimeConfig } from './runtime-config';

/** Where Umami is on this origin (nginx forwards /stats/ to it). */
export const StatsPath = '/stats';

/**
 * Visit statistics with Umami when the deployment has a website id: its
 * tracker (no cookies; Do Not Track respected) counts page views, client
 * side route changes included. Without an id no script is loaded.
 */
export async function startAnalytics(
    config: () => Promise<RuntimeConfig> = runtimeConfig
): Promise<boolean> {
    const websiteId = (await config()).umamiWebsiteId?.trim();
    if (!websiteId) return false;

    const script = document.createElement('script');
    script.defer = true;
    script.src = `${StatsPath}/script.js`;
    script.dataset.websiteId = websiteId;
    script.dataset.hostUrl = `${location.origin}${StatsPath}`;
    script.dataset.doNotTrack = 'true';
    document.head.append(script);
    return true;
}
