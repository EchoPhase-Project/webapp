/** A browser and system read off a User-Agent; null for anything else. */
export interface Device {
    browser: string | null;
    os: string | null;
}

// Order matters: Edge and Opera say Chrome too, Chrome says Safari.
const Browsers: [RegExp, string][] = [
    [/\bEdg(?:e|A|iOS)?\/[\d.]+/, 'Edge'],
    [/\bOPR\/[\d.]+/, 'Opera'],
    [/\bFirefox\/[\d.]+/, 'Firefox'],
    [/\bChrome\/[\d.]+/, 'Chrome'],
    [/\bVersion\/[\d.]+.*Safari\//, 'Safari'],
];

const Systems: [RegExp, string][] = [
    [/\bAndroid\b/, 'Android'],
    [/\b(iPhone|iPad|iPod)\b/, 'iOS'],
    [/\bWindows\b/, 'Windows'],
    [/\bMac OS X\b|\bMacintosh\b/, 'macOS'],
    [/\bCrOS\b/, 'ChromeOS'],
    [/\bLinux\b|\bX11\b/, 'Linux'],
];

const first = (ua: string, table: [RegExp, string][]) =>
    table.find(([pattern]) => pattern.test(ua))?.[1] ?? null;

/**
 * The device of a session: a browser's User-Agent becomes "Chrome on
 * Linux"; null when it is not one (an API client's name, a CLI), which the
 * caller shows as is.
 */
export function parseUserAgent(deviceId: string): Device | null {
    if (!/^Mozilla\//.test(deviceId)) return null;
    return { browser: first(deviceId, Browsers), os: first(deviceId, Systems) };
}
