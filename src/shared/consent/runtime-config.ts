/**
 * What the deployment tells the webapp at start: nginx serves /config.json
 * from its environment, so one image runs anywhere without a rebuild.
 * Empty values switch a feature off; on the dev server there is no
 * /config.json and everything stays off.
 */
export interface RuntimeConfig {
    sentryDsn?: string;
    umamiWebsiteId?: string;
}

const load = async (): Promise<RuntimeConfig> => {
    try {
        const res = await fetch('/config.json', { cache: 'no-store' });
        return res.ok ? ((await res.json()) as RuntimeConfig) : {};
    } catch {
        return {};
    }
};

let config: Promise<RuntimeConfig> | undefined;

/** The config, fetched once per page load. */
export const runtimeConfig = (): Promise<RuntimeConfig> => (config ??= load());
