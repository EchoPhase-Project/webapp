import { For } from 'solid-js';
import Field, { type FieldProps } from './Field';

/** The browser's IANA zones, offered as suggestions (the server checks). */
export function timeZones(): string[] {
    try {
        return Intl.supportedValuesOf('timeZone');
    } catch {
        return [];
    }
}

/** A Field for an IANA time zone, with the browser's zones as suggestions. */
export default function TimeZoneField(
    props: Omit<FieldProps, 'type' | 'list'>
) {
    const listId = () => `${props.id}-zones`;
    return (
        <>
            <Field type="text" spellcheck={false} {...props} list={listId()} />
            <datalist id={listId()}>
                <For each={timeZones()}>
                    {(zone) => <option value={zone} />}
                </For>
            </datalist>
        </>
    );
}
