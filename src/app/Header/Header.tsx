import type { JSX } from 'solid-js';
import { LanguageDropdown } from './LanguageDropdown';
import { ThemeToggle } from '@shared/theme/ThemeToggle';
import './header.scss';

/** The top bar: the app's own actions (notes, notifications), theme, language. */
export function Header(props: { actions?: JSX.Element }) {
    return (
        <header class="header">
            {props.actions}
            <ThemeToggle />
            <LanguageDropdown />
        </header>
    );
}
