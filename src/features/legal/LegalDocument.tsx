import { createRenderEffect, createResource, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { useI18n, type Translations } from '@shared/i18n/i18n-context';
import { useRootMeta } from '@shared/meta/page-meta';
import Card from '@shared/ui/Card';
import PageHeader from '@shared/ui/PageHeader';
import { blocksOf, inlinesOf, type Inline } from './markup';
import './legal.scss';

type Section = { title: string; body: string };

type LegalText = {
    title: string;
    description: string;
    updated: string;
    intro: string;
    sections: Record<string, Section>;
};

const text = (t: Translations | undefined) => t as LegalText | undefined;

// "2026-10-24" as "24 October 2026" in the page's language; a date, no zone.
const longDate = (day: string, locale: string) =>
    new Intl.DateTimeFormat(locale, {
        dateStyle: 'long',
        timeZone: 'UTC',
    }).format(new Date(`${day}T00:00:00Z`));

function Inlines(props: { items: Inline[] }) {
    return (
        <For each={props.items}>
            {(item) =>
                typeof item === 'string' ? (
                    item
                ) : item.href.startsWith('/') ? (
                    <A href={item.href}>{item.text}</A>
                ) : item.href.startsWith('#') ? (
                    <a href={item.href}>{item.text}</a>
                ) : (
                    <a href={item.href} target="_blank" rel="noopener">
                        {item.text}
                    </a>
                )
            }
        </For>
    );
}

function Body(props: { text: string }) {
    return (
        <For each={blocksOf(props.text)}>
            {(block) =>
                block.kind === 'list' ? (
                    <ul>
                        <For each={block.items}>
                            {(item) => (
                                <li>
                                    <Inlines items={inlinesOf(item)} />
                                </li>
                            )}
                        </For>
                    </ul>
                ) : (
                    <p>
                        <Inlines items={inlinesOf(block.text)} />
                    </p>
                )
            }
        </For>
    );
}

/**
 * A policy page (terms, privacy) from its locale files: <namespace>.<code>.json
 * with a title, intro and numbered sections, in the visitor's language with
 * English for what is not translated. The section bodies are plain text:
 * paragraphs split by a blank line, "- " lines as a list, [text](/path) links.
 */
export default function LegalDocument(props: { namespace: string }) {
    const i18n = useI18n();
    const { setTitle, setDescription } = useRootMeta();

    const [current] = createResource(i18n.currentLocale, (locale) =>
        i18n.loadNamespace(props.namespace, locale)
    );
    const [english] = createResource(() =>
        i18n.loadNamespace(props.namespace, 'en')
    );
    const doc = () => text(current()) ?? text(english());

    createRenderEffect(() => {
        const d = doc();
        if (!d) return;
        setTitle(`${d.title} · EchoPhase`);
        setDescription(d.description);
    });

    const sections = () => Object.entries(doc()?.sections ?? {});
    const anchor = (key: string) => `section-${key}`;

    return (
        <Show when={doc()}>
            {(d) => (
                <article class="legal">
                    <PageHeader
                        eyebrow={i18n.t('legal.eyebrow', 'Documents')}
                        title={d().title}
                        description={d().description}
                        meta={
                            <>
                                {i18n.t('legal.updated', 'Last updated')}:{' '}
                                {longDate(d().updated, i18n.currentLocale())}
                            </>
                        }
                    />

                    <div class="legal-layout">
                        <nav
                            class="legal-toc"
                            aria-label={i18n.t('legal.contents', 'Contents')}
                        >
                            <p class="legal-toc-title">
                                {i18n.t('legal.contents', 'Contents')}
                            </p>
                            <ol>
                                <For each={sections()}>
                                    {([key, section]) => (
                                        <li>
                                            <a href={`#${anchor(key)}`}>
                                                {section.title}
                                            </a>
                                        </li>
                                    )}
                                </For>
                            </ol>
                        </nav>

                        <Card class="legal-body">
                            <div class="legal-intro">
                                <Body text={d().intro} />
                            </div>
                            <For each={sections()}>
                                {([key, section], index) => (
                                    <section
                                        id={anchor(key)}
                                        aria-labelledby={`${anchor(key)}-title`}
                                    >
                                        <h2 id={`${anchor(key)}-title`}>
                                            <span class="legal-number">
                                                {index() + 1}.
                                            </span>{' '}
                                            {section.title}
                                        </h2>
                                        <Body text={section.body} />
                                    </section>
                                )}
                            </For>
                        </Card>
                    </div>
                </article>
            )}
        </Show>
    );
}
