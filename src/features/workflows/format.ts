/**
 * A duration in milliseconds as people read it, in their language: 850 ms,
 * 4.2 s, 3 min 5 s (мс, с, мин in Russian).
 */
export function formatDuration(
    ms: number | null | undefined,
    locale?: string
): string {
    if (ms === null || ms === undefined) return '';
    const unit = (value: number, name: string, digits = 0) =>
        new Intl.NumberFormat(locale, {
            style: 'unit',
            unit: name,
            unitDisplay: 'short',
            maximumFractionDigits: digits,
        }).format(value);
    if (ms < 1000) return unit(Math.round(ms), 'millisecond');
    const seconds = ms / 1000;
    if (seconds < 60) return unit(seconds, 'second', seconds < 10 ? 1 : 0);
    return `${unit(Math.floor(seconds / 60), 'minute')} ${unit(Math.round(seconds % 60), 'second')}`;
}

/** How a run's status reads at a glance: its tone for the badge. */
export function statusTone(status: string): 'ok' | 'bad' | 'busy' | 'quiet' {
    switch (status) {
        case 'succeeded':
            return 'ok';
        case 'failed':
        case 'timedOut':
        case 'interrupted':
            return 'bad';
        case 'queued':
        case 'running':
            return 'busy';
        default:
            return 'quiet';
    }
}
