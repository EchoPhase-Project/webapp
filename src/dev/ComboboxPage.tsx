import { createSignal } from 'solid-js';
import Combobox from '@shared/ui/Combobox';
import { timeZones } from '@shared/ui/forms/TimeZoneField';
import { type ListOption } from '@shared/ui/Listbox';

const languages: ListOption<string>[] = [
    { value: 'en', label: 'English', short: 'EN' },
    { value: 'ro', label: 'Română', short: 'RO' },
    { value: 'ru', label: 'Русский', short: 'RU' },
];

const workflows: ListOption<number>[] = Array.from({ length: 40 }, (_, i) => ({
    value: i + 1,
    label: `Workflow ${i + 1}`,
    hint: i % 3 === 0 ? 'Runs on a schedule' : undefined,
    disabled: i === 4,
}));

// The browser's time zones, each with its city as a hint.
const zoneOptions = (): ListOption<string>[] =>
    timeZones().map((zone) => ({
        value: zone,
        label: zone,
        hint: zone.split('/').at(-1)?.replaceAll('_', ' '),
    }));

const fruits: ListOption<string>[] = [
    'Apple',
    'Banana',
    'Blueberry',
    'Cherry',
    'Grape',
    'Mango',
    'Orange',
    'Pear',
].map((label) => ({ value: label.toLowerCase(), label }));

const resultsText = (count: number) =>
    count === 1 ? '1 result' : `${count} results`;

/**
 * Select-only Combobox: a short one with short labels, a long one.
 * Editable: the time zones, and a free text with suggestions.
 */
export default function ComboboxPage() {
    const [language, setLanguage] = createSignal<string | undefined>('en');
    const [workflow, setWorkflow] = createSignal<number | undefined>();
    const zones = zoneOptions();
    const [zone, setZone] = createSignal<string | undefined>(
        Intl.DateTimeFormat().resolvedOptions().timeZone
    );
    const [fruit, setFruit] = createSignal<string | undefined>();

    return (
        <div class="page-stack">
            <h1>Combobox</h1>

            <section>
                <h2>Short labels</h2>
                <Combobox
                    label="Language"
                    options={languages}
                    value={language()}
                    onChange={setLanguage}
                />
                <p>Selected: {language() ?? 'none'}</p>
            </section>

            <section>
                <h2 id="dev-combobox-long">A long list with hints</h2>
                <Combobox
                    labelledBy="dev-combobox-long"
                    options={workflows}
                    value={workflow()}
                    onChange={setWorkflow}
                    placeholder="Choose a workflow"
                />
                <p>Selected: {workflow() ?? 'none'}</p>
            </section>

            <section>
                <h2 id="dev-combobox-zone">Editable: time zones</h2>
                <Combobox
                    editable
                    labelledBy="dev-combobox-zone"
                    options={zones}
                    value={zone()}
                    onChange={setZone}
                    placeholder="Type a city or a region"
                    resultsText={resultsText}
                    noResults="No time zone matches"
                    moreResults="Type more letters to see the rest"
                    maxResults={20}
                />
                <p>Selected: {zone() ?? 'none'}</p>
            </section>

            <section>
                <h2 id="dev-combobox-custom">Editable: any text</h2>
                <Combobox
                    editable
                    allowCustom
                    labelledBy="dev-combobox-custom"
                    options={fruits}
                    value={fruit()}
                    onChange={setFruit}
                    placeholder="A fruit, or anything else"
                    resultsText={resultsText}
                    noResults="No suggestions; your text is kept"
                />
                <p>Value: {fruit() ?? 'none'}</p>
            </section>

            {/* Room below, so the long list can open downwards or upwards. */}
            <div style={{ height: '60vh' }} />
        </div>
    );
}
