import { For, Match, Switch, type JSX } from 'solid-js';
import { A } from '@solidjs/router';
import { AiOutlineGithub } from 'solid-icons/ai';
import { useI18n } from '@shared/i18n/i18n-context';
import { useAuth } from '@shared/api/auth-provider';
import { outage } from '@shared/api/outage-watch';
import { setSettingsOpen } from '@shared/lib/consent';
import BrandMark from '@shared/ui/BrandMark';
import './footer.scss';

const Org = 'https://github.com/EchoPhase-Project';

type Item = {
    text: string;
    href?: string;
    external?: boolean;
    onClick?: () => void;
};

function FooterLink(props: { item: Item }): JSX.Element {
    return (
        <Switch
            fallback={
                <A class="footer-link" href={props.item.href ?? '/'}>
                    {props.item.text}
                </A>
            }
        >
            <Match when={props.item.onClick}>
                {(onClick) => (
                    <button
                        type="button"
                        class="footer-link"
                        onClick={() => onClick()()}
                    >
                        {props.item.text}
                    </button>
                )}
            </Match>
            <Match when={props.item.external}>
                <a
                    class="footer-link"
                    href={props.item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {props.item.text}
                </a>
            </Match>
        </Switch>
    );
}

/**
 * The site's footer: the mark and what EchoPhase is on the left, columns of
 * links by topic on the right, and a line of small print with the service's
 * state as this browser sees it (the status page itself is private).
 */
export default function Footer() {
    const { t } = useI18n();
    const { isAuthenticated } = useAuth();

    const columns = (): { title: string; items: Item[] }[] => [
        {
            title: t('footer.product', 'Product'),
            items: [
                { text: t('footer.about', 'About'), href: '/about' },
                {
                    text: t('footer.features', 'Features'),
                    href: '/about#about-features',
                },
                isAuthenticated()
                    ? {
                          text: t('nav.api_clients.label', 'API clients'),
                          href: '/api-clients',
                      }
                    : {
                          text: t('footer.start', 'Get started'),
                          href: '/auth?mode=signup',
                      },
            ],
        },
        {
            title: t('footer.resources', 'Resources'),
            items: [
                { text: t('footer.docs', 'Documentation'), href: '/docs' },
                {
                    text: t('footer.source', 'Source code'),
                    href: Org,
                    external: true,
                },
                {
                    text: t('footer.self_host', 'Run it yourself'),
                    href: `${Org}/charts`,
                    external: true,
                },
                {
                    text: t('footer.issues', 'Report a problem'),
                    href: `${Org}/server/issues`,
                    external: true,
                },
            ],
        },
        {
            title: t('footer.legal', 'Legal'),
            items: [
                { text: t('footer.terms', 'Terms of Use'), href: '/terms' },
                {
                    text: t('footer.privacy', 'Privacy Policy'),
                    href: '/privacy',
                },
                {
                    text: t('footer.cookies', 'Cookie settings'),
                    onClick: () => setSettingsOpen(true),
                },
            ],
        },
    ];

    return (
        <footer class="site-footer">
            <div class="footer-main">
                <div class="footer-brand">
                    <A href="/" class="footer-logo">
                        <BrandMark class="footer-mark" />
                        EchoPhase
                    </A>
                    <p class="footer-tagline">
                        {t(
                            'footer.tagline',
                            'Bots and services, connected in one place.'
                        )}
                    </p>
                    <a
                        class="footer-icon"
                        href={Org}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="GitHub"
                    >
                        <AiOutlineGithub />
                    </a>
                </div>

                <nav
                    class="footer-columns"
                    aria-label={t('footer.label', 'Site')}
                >
                    <For each={columns()}>
                        {(column) => (
                            <div class="footer-column">
                                <p class="footer-heading">{column.title}</p>
                                <ul>
                                    <For each={column.items}>
                                        {(item) => (
                                            <li>
                                                <FooterLink item={item} />
                                            </li>
                                        )}
                                    </For>
                                </ul>
                            </div>
                        )}
                    </For>
                </nav>
            </div>

            <div class="footer-bottom">
                <span>© {new Date().getFullYear()} EchoPhase</span>
                <span
                    class="footer-status"
                    classList={{ 'footer-status--down': !!outage() }}
                    role="status"
                >
                    <span class="footer-status-dot" aria-hidden="true" />
                    {outage()
                        ? t('footer.status_down', 'Service unavailable')
                        : t('footer.status_ok', 'Service is running')}
                </span>
            </div>
        </footer>
    );
}
