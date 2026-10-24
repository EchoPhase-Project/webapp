import { createMemo } from 'solid-js';
import { useI18n } from '@shared/i18n/i18n-context';
import { Dropdown } from './Dropdown';

export function LanguageDropdown(props: { returnUrl?: string }) {
    const { availableLocales, setLocale, currentLocale, t } = useI18n();

    const options = createMemo(() => {
        const locales = availableLocales();
        if (!locales) return [];

        return locales.map(({ code, nativeName }) => ({
            value: code,
            label: code.toUpperCase(),
            ariaLabel: nativeName,
        }));
    });

    const handleChange = (newLocale: string) => {
        setLocale(newLocale);
        if (props.returnUrl) {
            window.location.href = props.returnUrl;
        }
    };

    return (
        <Dropdown
            options={options()}
            selectedValue={currentLocale()}
            onChange={handleChange}
            ariaLabel={t('select_language', 'Select language')}
            noResults={t('no_matches', 'No matches')}
        />
    );
}
