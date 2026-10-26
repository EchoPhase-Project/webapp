import {
    createEffect,
    createRenderEffect,
    createSignal,
    on,
    onCleanup,
    Show,
} from 'solid-js';
import { A, useSearchParams } from '@solidjs/router';
import { useRootMeta } from '@shared/meta/page-meta';
import { useAuth } from '@shared/api/auth-provider';
import type { WorkflowPackage } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import EmptyState from '@shared/ui/EmptyState';
import Masonry from '@shared/ui/Masonry';
import PageHeader from '@shared/ui/PageHeader';
import { explorePackages } from './api';
import PackageCard from './components/PackageCard';
import PackageSearch, { parseQuery, queryOf } from './components/PackageSearch';
import './packages.scss';

/** Published packages, everyone's public ones: to read and install. The caller's own are in Packages. */
export default function ExplorePage() {
    const { setTitle, setDescription } = useRootMeta();
    const { isAuthenticated } = useAuth();
    const t = useLocalizer('packages');
    const [params, setParams] = useSearchParams<{ tag?: string }>();

    createRenderEffect(() => {
        setTitle(`${t('title', 'Explore')} · EchoPhase`);
        setDescription(
            t('description', 'Workflow packages to read and install.')
        );
    });

    const tag = () => params.tag ?? '';

    // The line as typed: words and `tag:name`; the tag lives in the address too.
    const [query, setQuery] = createSignal(queryOf(params.tag ?? '', ''));
    // The words, once typing pauses.
    const [search, setSearch] = createSignal('');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onSearch = (value: string, now = false) => {
        setQuery(value);
        clearTimeout(timer);
        const apply = () => {
            const parsed = parseQuery(value);
            setSearch(parsed.words);
            if (parsed.tag !== tag())
                setParams({ tag: parsed.tag || undefined });
        };
        if (now) apply();
        else timer = setTimeout(apply, 250);
    };
    // A tag picked on a card goes into the line, with the words kept.
    const pickTag = (picked: string) =>
        onSearch(queryOf(picked, parseQuery(query()).words), true);

    const [packages, setPackages] = createSignal<WorkflowPackage[]>([]);
    // Where the next page of Explore starts; null: nothing more.
    const [next, setNext] = createSignal<string | null>(null);
    const [loading, setLoading] = createSignal(false);
    const [loaded, setLoaded] = createSignal(false);
    // A newer list (another tab, search or tag) makes older answers stale.
    let generation = 0;

    async function load(more: boolean) {
        const mine = generation;
        setLoading(true);
        try {
            const result = await explorePackages(
                search(),
                tag(),
                more ? (next() ?? undefined) : undefined
            );
            if (mine !== generation || !result.ok) return;
            setPackages((list) =>
                more ? [...list, ...result.data.items] : result.data.items
            );
            setNext(result.data.next);
            setLoaded(true);
        } finally {
            if (mine === generation) setLoading(false);
        }
    }

    createEffect(
        on(
            () => (isAuthenticated() ? [search(), tag()] : false),
            (key) => {
                if (!key) return;
                generation++;
                setLoaded(false);
                setPackages([]);
                setNext(null);
                void load(false);
            }
        )
    );

    const loadMore = () => {
        if (next() && !loading()) void load(true);
    };

    // The next page comes as the end of the list scrolls into view.
    const watchEnd = (el: HTMLElement) => {
        if (typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(
            (entries) => entries.some((e) => e.isIntersecting) && loadMore(),
            { rootMargin: '400px' }
        );
        observer.observe(el);
        onCleanup(() => observer.disconnect());
    };

    return (
        <div class="packages-container">
            <PageHeader
                eyebrow={t('eyebrow', 'Workflows')}
                title={t('title', 'Explore')}
                description={t(
                    'lead',
                    'Packages others published, to install.'
                )}
                more={t(
                    'more_about',
                    'Installing one makes a package of yours with its workflows, pointed at your connections; the author’s stay theirs.'
                )}
                actions={
                    <A class="btn btn-ghost" href="/packages">
                        {t('yours', 'Your packages')}
                    </A>
                }
            />

            <PackageSearch value={query()} onInput={onSearch} />

            <Show
                when={packages().length > 0}
                fallback={
                    <Show when={loaded()}>
                        <EmptyState>
                            {search() || tag()
                                ? t('none_found', 'No packages match.')
                                : t(
                                      'empty',
                                      'Nobody has published a package yet.'
                                  )}
                        </EmptyState>
                    </Show>
                }
            >
                <Masonry each={packages()}>
                    {(pkg) => <PackageCard pkg={pkg} onTag={pickTag} />}
                </Masonry>
                <Show when={next()}>
                    <div class="packages-more" ref={watchEnd}>
                        <Button
                            variant="ghost"
                            busy={loading()}
                            onClick={loadMore}
                        >
                            {t('more', 'Show more')}
                        </Button>
                    </div>
                </Show>
            </Show>
        </div>
    );
}
