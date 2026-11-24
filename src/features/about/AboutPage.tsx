import { For, type Component } from 'solid-js';
import { A } from '@solidjs/router';
import { usePageMeta } from '@shared/meta/page-meta';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { useAuth } from '@shared/api/auth';
import { SIGNUP_PATH } from '@shared/api/auth-guards';
import Card from '@shared/ui/Card';
import {
    IconApi,
    IconBolt,
    IconBrandGithub,
    IconCode,
    IconLock,
    IconPlugConnected,
    IconServer,
    IconSitemap,
} from '@shared/ui/icons';
import './about.scss';

const Org = 'https://github.com/EchoPhase-Project';

type Item = { key: string; icon: Component<{ class?: string }> };

const FEATURES: Item[] = [
    { key: 'connections', icon: IconPlugConnected },
    { key: 'workflows', icon: IconSitemap },
    { key: 'api', icon: IconApi },
    { key: 'realtime', icon: IconBolt },
];

const PRINCIPLES: Item[] = [
    { key: 'open', icon: IconCode },
    { key: 'self_hosted', icon: IconServer },
    { key: 'private', icon: IconLock },
];

// English fallbacks; the texts live in about.<code>.json.
const EN: Record<string, { title: string; text: string }> = {
    connections: {
        title: 'Connections',
        text: 'Link Discord and Twitch accounts once; EchoPhase keeps their tokens fresh and encrypted, and your bots use them.',
    },
    workflows: {
        title: 'Workflows',
        text: 'Automate tasks from blocks that run on a schedule or on events, with storage that persists between runs.',
    },
    api: {
        title: 'API and API clients',
        text: 'Everything the web app does is in the API. Give each bot or script its own client with only the permissions it needs.',
    },
    realtime: {
        title: 'Realtime gateway',
        text: 'One WebSocket for events from your connections and workflows, as they happen.',
    },
    open: {
        title: 'Open source',
        text: 'Server, web app and chart are public under the BSD 3-Clause License.',
    },
    self_hosted: {
        title: 'Yours to run',
        text: 'Run your own instance with the Helm chart or Docker Compose.',
    },
    private: {
        title: 'Private by default',
        text: 'No ads or third-party trackers; statistics and error reports are self-hosted and only with your permission.',
    },
};

export default function AboutPage() {
    const t = useLocalizer('about');
    const { isAuthenticated } = useAuth();

    usePageMeta(() => ({
        title: t('title', 'About'),
        description: t(
            'description',
            'EchoPhase is an open-source platform for managing bots and connecting services.'
        ),
    }));

    const text = (key: string, part: 'title' | 'text') =>
        t(`items.${key}.${part}`, EN[key][part]);

    const Items = (props: { items: Item[]; class: string }) => (
        <div class={props.class}>
            <For each={props.items}>
                {(item) => (
                    <Card class="about-item">
                        <item.icon class="about-item-icon" />
                        <h3>{text(item.key, 'title')}</h3>
                        <p>{text(item.key, 'text')}</p>
                    </Card>
                )}
            </For>
        </div>
    );

    return (
        <div class="about">
            <Card patterned class="about-hero">
                <p class="about-eyebrow">{t('eyebrow', 'About EchoPhase')}</p>
                <h1>
                    {t('heading', 'Bots and services, connected in one place')}
                </h1>
                <p class="about-lead">
                    {t(
                        'lead',
                        'EchoPhase is an open-source platform for managing bots and connecting services: link your accounts, automate tasks with workflows and reach everything through one API.'
                    )}
                </p>
                <div class="about-actions">
                    <A
                        class="btn"
                        href={isAuthenticated() ? '/api-clients' : SIGNUP_PATH}
                    >
                        {isAuthenticated()
                            ? t('cta.signed_in', 'Your API clients')
                            : t('cta.start', 'Get started')}
                    </A>
                    <a
                        class="btn btn-ghost"
                        href={Org}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <IconBrandGithub />
                        {t('cta.source', 'Source code')}
                    </a>
                </div>
            </Card>

            <section aria-labelledby="about-features">
                <h2 id="about-features">
                    {t('features_title', 'What you can do')}
                </h2>
                <Items items={FEATURES} class="about-grid" />
            </section>

            <section aria-labelledby="about-principles">
                <h2 id="about-principles">
                    {t('principles_title', 'How it is made')}
                </h2>
                <Items items={PRINCIPLES} class="about-grid about-grid--3" />
            </section>

            <p class="about-footnote muted">
                {t('footnote', 'Questions or ideas? Open an issue on')}{' '}
                <a href={Org} target="_blank" rel="noopener noreferrer">
                    GitHub
                </a>
                {'. '}
                {t('footnote_policies', 'See also the')}{' '}
                <A href="/terms">{t('terms', 'Terms of Use')}</A>{' '}
                {t('and', 'and')}{' '}
                <A href="/privacy">{t('privacy', 'Privacy Policy')}</A>.
            </p>
        </div>
    );
}
