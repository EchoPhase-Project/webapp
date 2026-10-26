import { useLocalizer } from '@shared/i18n/i18n-context';
import { statusTone } from '@features/packages/format';

/** A run's status as a badge: its word, and a colour that only repeats it. */
export default function RunStatus(props: { status: string }) {
    const t = useLocalizer('workflows');
    return (
        <span class={`run-status run-status--${statusTone(props.status)}`}>
            {t(`status.${props.status}`, props.status)}
        </span>
    );
}
