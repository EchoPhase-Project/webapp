import { useTheme } from './theme-context';
import { useI18n } from '@shared/i18n/i18n-context';
import { IconMoon, IconSun } from '@shared/ui/icons';
import './theme.scss';

export function ThemeToggle() {
    const [theme, setTheme] = useTheme();
    const { t } = useI18n();

    const toggle = () => {
        setTheme(theme() === 'light' ? 'dark' : 'light');
    };

    // Said to screen readers and shown on hover, like the other buttons.
    const label = () =>
        theme() === 'light'
            ? t('theme.to_dark', 'Switch to dark theme')
            : t('theme.to_light', 'Switch to light theme');

    return (
        <button
            type="button"
            class="theme-toggle"
            onClick={toggle}
            aria-label={label()}
            title={label()}
        >
            {theme() === 'dark' ? (
                <IconMoon class="theme" />
            ) : (
                <IconSun class="theme" />
            )}
        </button>
    );
}
