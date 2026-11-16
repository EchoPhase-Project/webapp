import { createSignal } from 'solid-js';
import Combobox from '@shared/ui/Combobox';
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

/** Select-only Combobox: a short one with short labels, a long one. */
export default function ComboboxPage() {
    const [language, setLanguage] = createSignal<string | undefined>('en');
    const [workflow, setWorkflow] = createSignal<number | undefined>();

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

            {/* Room below, so the long list can open downwards or upwards. */}
            <div style={{ height: '60vh' }} />
        </div>
    );
}
