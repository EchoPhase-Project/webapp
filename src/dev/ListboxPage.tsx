import { createSignal } from 'solid-js';
import Listbox, { type ListOption } from '@shared/ui/Listbox';

const languages: ListOption<string>[] = [
    { value: 'en', label: 'English', short: 'EN' },
    { value: 'ro', label: 'Română', short: 'RO' },
    { value: 'ru', label: 'Русский', short: 'RU' },
    { value: 'de', label: 'Deutsch', short: 'DE', disabled: true },
    { value: 'fr', label: 'Français', short: 'FR' },
];

const workflows: ListOption<number>[] = Array.from({ length: 24 }, (_, i) => ({
    value: i + 1,
    label: `Workflow ${i + 1}`,
    hint: i % 3 === 0 ? 'Runs on a schedule' : undefined,
    disabled: i === 4,
}));

/** Listbox with one choice and with more than one, for trying the keys. */
export default function ListboxPage() {
    const [language, setLanguage] = createSignal<string | undefined>('ro');
    const [picked, setPicked] = createSignal<number[]>([2, 3]);

    return (
        <div class="page-stack">
            <h1>Listbox</h1>

            <section>
                <h2 id="dev-listbox-single">One choice</h2>
                <Listbox
                    labelledBy="dev-listbox-single"
                    options={languages}
                    value={language()}
                    onChange={setLanguage}
                />
                <p>Selected: {language() ?? 'none'}</p>
            </section>

            <section>
                <h2 id="dev-listbox-multiple">More than one choice</h2>
                <Listbox
                    multiple
                    labelledBy="dev-listbox-multiple"
                    options={workflows}
                    value={picked()}
                    onChange={setPicked}
                />
                <p>Selected: {picked().join(', ') || 'none'}</p>
            </section>
        </div>
    );
}
