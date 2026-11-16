import { createMemo } from 'solid-js';
import { useI18n } from '@shared/i18n/i18n-context';
import Combobox from '@shared/ui/Combobox';
import type { ListOption } from '@shared/ui/Listbox';

/**
 * The header's language picker: a select-only Combobox that shows the
 * language's code ("EN") and lists the languages by their own names.
 */
export function LanguageSelect() {
    const { availableLocales, setLocale, currentLocale, t } = useI18n();

    const options = createMemo<ListOption<string>[]>(() =>
        (availableLocales() ?? []).map(({ code, nativeName }) => ({
            value: code,
            label: nativeName,
            short: code.toUpperCase(),
            // The code under the name, as on the button.
            hint: code.toUpperCase(),
        }))
    );

    const label = () => t('select_language', 'Select language');
    // Shown on hover, as the other header buttons' names are.
    const title = () => {
        const option = options().find((o) => o.value === currentLocale());
        return option
            ? `${label()}: ${option.label} (${option.short})`
            : label();
    };

    return (
        <Combobox
            class="header-language"
            options={options()}
            value={currentLocale()}
            onChange={setLocale}
            label={label()}
            title={title()}
        />
    );
}
