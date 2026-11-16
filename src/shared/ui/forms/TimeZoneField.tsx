import { createMemo, Show } from 'solid-js';
import type { ErrorItem } from '@shared/api/types';
import { useI18n } from '@shared/i18n/i18n-context';
import Combobox from '@shared/ui/Combobox';
import type { ListOption } from '@shared/ui/Listbox';
import FieldError, { errorId } from './FieldError';
import './forms.scss';

/** The browser's IANA zones, or none if it cannot list them. */
export function timeZones(): string[] {
    try {
        return Intl.supportedValuesOf('timeZone');
    } catch {
        return [];
    }
}

// The hint of each zone, made once: one Intl.DateTimeFormat each.
const hints = new Map<string, string>();

/** The zone's current offset from UTC, e.g. "UTC+2", or '' if unknown. */
function offsetOf(zone: string): string {
    try {
        const name = new Intl.DateTimeFormat('en-US', {
            timeZone: zone,
            timeZoneName: 'shortOffset',
        })
            .formatToParts(new Date())
            .find((part) => part.type === 'timeZoneName')?.value;
        return name ? name.replace(/^GMT/, 'UTC') : '';
    } catch {
        return '';
    }
}

/**
 * What a search for a zone can find besides its id: the place in words
 * ("New York", "La Rioja, Argentina") and the offset ("UTC-5").
 */
function zoneHint(zone: string): string {
    let hint = hints.get(zone);
    if (hint === undefined) {
        const place = zone
            .split('/')
            .slice(1)
            .reverse()
            .map((part) => part.replaceAll('_', ' '))
            .join(', ');
        hint = [place, offsetOf(zone)].filter(Boolean).join(' · ');
        hints.set(zone, hint);
    }
    return hint;
}

const zoneOption = (zone: string): ListOption<string> => ({
    value: zone,
    label: zone,
    hint: zoneHint(zone) || undefined,
});

export type TimeZoneFieldProps = {
    id: string;
    name: string;
    label: string;
    /** Above the field; otherwise for screen readers, the placeholder shows it. */
    showLabel?: boolean;
    /** The IANA zone, or '' for none. */
    value: string;
    /** Runs when the user picks another zone ('' when an optional one is cleared). */
    onChange: (zone: string) => void;
    /** An empty field is allowed: it clears the zone (onChange('')). */
    optional?: boolean;
    placeholder?: string;
    disabled?: boolean;
    /** The server's errors about this field, shown right under it. */
    errors?: ErrorItem[];
};

/**
 * A field for an IANA time zone: an editable Combobox of the browser's
 * zones (the city and the offset help the search), with a label and errors
 * as a Field has them. Only a zone from the list goes in. If the browser
 * cannot list the zones, the field offers the current one and UTC only,
 * and says so.
 */
export default function TimeZoneField(props: TimeZoneFieldProps) {
    const { t } = useI18n();
    const zones = timeZones();
    const listed = zones.length > 0;
    // UTC comes first, though some browsers do not list it: each hint
    // holds "UTC", so a search for it finds all zones, and UTC on top.
    const all = ['UTC', ...zones.filter((zone) => zone !== 'UTC')].map(
        zoneOption
    );
    const known = new Set(all.map((option) => option.value));

    // The current zone stays a choice, even if the browser does not list
    // it (an old name, or no list at all).
    const options = createMemo(() => {
        const value = props.value;
        return !value || known.has(value) ? all : [zoneOption(value), ...all];
    });

    const labelId = () => `${props.id}-label`;
    const noteId = () => `${props.id}-note`;
    const invalid = () => !!props.errors?.length;
    const describedBy = () =>
        [listed ? '' : noteId(), invalid() ? errorId(props.id) : '']
            .filter(Boolean)
            .join(' ') || undefined;

    return (
        <div class="field-wrap">
            <label
                id={labelId()}
                for={props.id}
                class={props.showLabel ? 'field-label' : 'visually-hidden'}
            >
                {props.label}
            </label>
            <Combobox
                editable
                class="field-combobox"
                id={props.id}
                name={props.name}
                labelledBy={labelId()}
                options={options()}
                value={props.value || undefined}
                onChange={(zone) => props.onChange(zone)}
                onClear={props.optional ? () => props.onChange('') : undefined}
                placeholder={
                    props.placeholder ??
                    (props.showLabel ? undefined : props.label)
                }
                disabled={props.disabled}
                invalid={invalid()}
                describedBy={describedBy()}
                resultsText={(count) =>
                    t('ui.results_count', 'Found: {count}', { count })
                }
                noResults={t('ui.no_results', 'Nothing found')}
                moreResults={t(
                    'ui.more_results',
                    'Type more letters to see the rest.'
                )}
            />
            <Show when={!listed}>
                <p id={noteId()} class="muted field-note">
                    {t(
                        'ui.time_zones_unlisted',
                        'This browser cannot list the time zones. To pick another zone, open this page in a newer browser.'
                    )}
                </p>
            </Show>
            <FieldError for={props.id} errors={props.errors} />
        </div>
    );
}
