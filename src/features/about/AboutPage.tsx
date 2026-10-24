import { createRenderEffect, For, type Component } from 'solid-js';
import { A } from '@solidjs/router';
import { useRootMeta } from '@shared/meta/page-meta';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { useAuth } from '@shared/api/auth-provider';
import Card from '@shared/ui/Card';
import { AiOutlineApi, AiOutlineGithub } from 'solid-icons/ai';
import { BsDiagram3 } from 'solid-icons/bs';
import { TbOutlinePlugConnected, TbOutlineBolt } from 'solid-icons/tb';
import { FiLock, FiServer, FiCode } from 'solid-icons/fi';
import './about.scss';

const Org = 'https://github.com/EchoPhase-Project';

type Item = { key: string; icon: Component<{ class?: string }> };

const FEATURES: Item[] = [
    { key: 'connections', icon: TbOutlinePlugConnected },
    { key: 'workflows', icon: BsDiagram3 },
    { key: 'api', icon: AiOutlineApi },
    { key: 'realtime', icon: TbOutlineBolt },
];

const PRINCIPLES: Item[] = [
    { key: 'open', icon: FiCode },
    { key: 'self_hosted', icon: FiServer },
    { key: 'private', icon: FiLock },
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
    const { setTitle, setDescription } = useRootMeta();
    const t = useLocalizer('about');
    const { isAuthenticated } = useAuth();

    createRenderEffect(() => {
        setTitle(`${t('title', 'About')} · EchoPhase`);
        setDescription(
            t(
                'description',
                'EchoPhase is an open-source platform for managing bots and connecting services.'
            )
        );
    });

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
                        href={
                            isAuthenticated()
                                ? '/api-clients'
                                : '/auth?mode=signup'
                        }
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
                        <AiOutlineGithub />
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
