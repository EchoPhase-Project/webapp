import { useAuth } from '@shared/api/auth';
import { useI18n } from '@shared/i18n/i18n-context';
import { DateHelper } from '@shared/lib/date-helper';

/**
 * Formats API times (ISO 8601) in the signed-in user's time zone and the
 * current language, so they read the same on any device; empty for null.
 * Call it in a component; the result follows the zone and language.
 */
export function useDateFormat(): (iso: string | null | undefined) => string {
    const { user } = useAuth();
    const i18n = useI18n();
    return (iso) =>
        DateHelper.format(iso, user()?.timeZone, i18n.currentLocale());
}
