import { useTheme } from './theme-context';
import { useI18n } from '@shared/i18n/i18n-context';
import { IconMoon, IconSun } from '@shared/ui/icons';
import HeaderButton from '@shared/ui/HeaderButton';

export function ThemeToggle() {
    const [theme, setTheme] = useTheme();
    const { t } = useI18n();

    const toggle = () => {
        setTheme(theme() === 'light' ? 'dark' : 'light');
    };

    // Said to screen readers and shown on hover, as the other header buttons.
    const label = () =>
        theme() === 'light'
            ? t('theme.to_dark', 'Switch to dark theme')
            : t('theme.to_light', 'Switch to light theme');

    return (
        <HeaderButton label={label()} onClick={toggle}>
            {theme() === 'dark' ? (
                <IconMoon class="theme-toggle-icon" />
            ) : (
                <IconSun class="theme-toggle-icon" />
            )}
        </HeaderButton>
    );
}
