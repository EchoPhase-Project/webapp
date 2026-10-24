import { LanguageDropdown } from './LanguageDropdown';
import { ThemeToggle } from '@shared/theme/ThemeToggle';

export function Header() {
    return (
        <header class="header">
            <ThemeToggle />
            <LanguageDropdown />
        </header>
    );
}
