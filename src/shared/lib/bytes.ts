const UNITS = ['kilobyte', 'megabyte', 'gigabyte'] as const;

/**
 * A size for people: "740 B", "2.4 MB", the number in the locale's way of
 * writing it (Intl's "byte" reads "740 byte", hence the plain B).
 */
export function formatBytes(bytes: number, locale?: string): string {
    if (bytes < 1024) return `${new Intl.NumberFormat(locale).format(bytes)} B`;
    let value = bytes / 1024;
    let unit = 0;
    while (value >= 1024 && unit < UNITS.length - 1) {
        value /= 1024;
        unit++;
    }
    return new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: UNITS[unit],
        unitDisplay: 'short',
        maximumFractionDigits: value >= 10 ? 0 : 1,
    }).format(value);
}
