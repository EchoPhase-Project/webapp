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
 * end. With the rail (`rail`) it is the top arm of an L: its left cell sits
 * over the rail's icons, and its bottom line starts where the rail ends.
 */
export function Header(props: { actions?: JSX.Element; rail?: boolean }) {
    const { t } = useI18n();
    return (
        <header class="header" classList={{ 'header--rail': props.rail }}>
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
            </div>
        </header>
    );
}
