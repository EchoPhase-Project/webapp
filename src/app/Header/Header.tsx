import type { JSX } from 'solid-js';
import { A } from '@solidjs/router';
import { useI18n } from '@shared/i18n/i18n-context';
import { ThemeToggle } from '@shared/theme/ThemeToggle';
import BrandTile from '@app/BrandTile';
import { LanguageSelect } from './LanguageSelect';
import './header.scss';

/**
 * The top bar across the window: the logo (the way home) in its left cell,
 * the app's own actions (notes, notifications), theme and language at the
 * end. On desktop it is the top arm of an L with the rail: its left cell
 * sits over the rail's icons, and its bottom line starts where the rail
 * ends. Signed out, logging in and signing up close it (`account`), as on
 * most sites.
 */
export function Header(props: {
    actions?: JSX.Element;
    account?: JSX.Element;
}) {
    const { t } = useI18n();
    return (
        <header class="header">
            <div class="header-brand">
                <A
                    href="/"
                    end
                    class="header-home"
                    aria-label={t('nav.home', 'Home')}
                >
                    <BrandTile />
                </A>
            </div>
            <div class="header-actions">
                {props.actions}
                <ThemeToggle />
                <LanguageSelect />
                {props.account}
            </div>
        </header>
    );
}
