import {
    createEffect,
    createRenderEffect,
    createSignal,
    on,
    onCleanup,
    Show,
} from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { AiOutlineClose, AiOutlinePlus, AiOutlineSearch } from 'solid-icons/ai';
import { useRootMeta } from '@shared/meta/page-meta';
import { useAuth } from '@shared/api/auth-provider';
import type { WorkflowPackage } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import EmptyState from '@shared/ui/EmptyState';
import Field from '@shared/ui/Field';
import Masonry from '@shared/ui/Masonry';
import PageHeader from '@shared/ui/PageHeader';
import { explorePackages, myPackages } from './api';
import PackageCard from './components/PackageCard';
import PackageEditorModal from './components/PackageEditorModal';
import './packages.scss';

type Tab = 'explore' | 'mine';

/** Published workflow packages: everyone's public ones, and the caller's own and shared. */
export default function ExplorePage() {
    const { setTitle, setDescription } = useRootMeta();
    const { isAuthenticated } = useAuth();
    const t = useLocalizer('packages');
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams<{
        tab?: string;
        tag?: string;
    }>();

    createRenderEffect(() => {
        setTitle(`${t('title', 'Explore')} · EchoPhase`);
        setDescription(
            t('description', 'Workflow packages to read and install.')
        );
    });

    const tab = (): Tab => (params.tab === 'mine' ? 'mine' : 'explore');
    const tag = () => params.tag ?? '';

    const [query, setQuery] = createSignal('');
    // The search waits for a pause in typing.
    const [search, setSearch] = createSignal('');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onSearch = (value: string) => {
        setQuery(value);
        clearTimeout(timer);
        timer = setTimeout(() => setSearch(value.trim()), 250);
    };

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
            if (tab() === 'mine') {
                // Their own list is short: whole, filtered here.
                const needle = search().toLowerCase();
                const list = (await myPackages()).filter(
                    (p) =>
                        (!tag() || p.tags.includes(tag())) &&
                        (!needle ||
                            p.name.toLowerCase().includes(needle) ||
                            p.summary.toLowerCase().includes(needle))
                );
                if (mine !== generation) return;
                setPackages(list);
                setNext(null);
            } else {
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
            }
            setLoaded(true);
        } finally {
            if (mine === generation) setLoading(false);
        }
    }

    createEffect(
        on(
            () => (isAuthenticated() ? [tab(), search(), tag()] : false),
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

    const [creating, setCreating] = createSignal(false);

    const selectTab = (target: Tab) =>
        setParams({ tab: target === 'mine' ? 'mine' : undefined });

    return (
        <div class="packages-container">
            <PageHeader
                eyebrow={t('eyebrow', 'Workflows')}
                title={t('title', 'Explore')}
                description={t(
                    'lead',
                    'Workflows published together with a README. Installing one copies its workflows into yours, linked to each other and to your connections; the author’s stay theirs.'
                )}
                actions={
                    <Button onClick={() => setCreating(true)}>
                        <AiOutlinePlus />
                        {t('new', 'Publish workflows')}
                    </Button>
                }
            />

            <div class="packages-toolbar">
                <div class="packages-tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        class="packages-tab"
                        aria-selected={tab() === 'explore'}
                        onClick={() => selectTab('explore')}
                    >
                        {t('tab.explore', 'Everyone’s')}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        class="packages-tab"
                        aria-selected={tab() === 'mine'}
                        onClick={() => selectTab('mine')}
                    >
                        {t('tab.mine', 'Mine and shared')}
                    </button>
                </div>
                <div class="packages-search">
                    <Field
                        id="packages-search"
                        name="q"
                        type="search"
                        icon={AiOutlineSearch}
                        label={t('search', 'Search packages')}
                        value={query()}
                        onInput={(e) => onSearch(e.currentTarget.value)}
                    />
                </div>
                <Show when={tag()}>
                    <button
                        type="button"
                        class="package-tag package-tag-active"
                        aria-label={t(
                            'tag_clear',
                            'Stop filtering by #{tag}'
                        ).replace('{tag}', tag())}
                        onClick={() => setParams({ tag: undefined })}
                    >
                        #{tag()} <AiOutlineClose aria-hidden="true" />
                    </button>
                </Show>
            </div>

            <Show
                when={packages().length > 0}
                fallback={
                    <Show when={loaded()}>
                        <EmptyState
                            action={
                                <Show
                                    when={
                                        tab() === 'mine' && !search() && !tag()
                                    }
                                >
                                    <Button onClick={() => setCreating(true)}>
                                        {t('first', 'Publish your first')}
                                    </Button>
                                </Show>
                            }
                        >
                            {search() || tag()
                                ? t('none_found', 'No packages match.')
                                : tab() === 'mine'
                                  ? t('empty_mine', 'You have no packages yet.')
                                  : t(
                                        'empty',
                                        'Nobody has published a package yet.'
                                    )}
                        </EmptyState>
                    </Show>
                }
            >
                <Masonry each={packages()}>
                    {(pkg) => (
                        <PackageCard
                            pkg={pkg}
                            onTag={(picked) => setParams({ tag: picked })}
                        />
                    )}
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

            <PackageEditorModal
                open={creating()}
                onClose={() => setCreating(false)}
                onSaved={(pkg) => {
                    setCreating(false);
                    navigate(`/explore/${pkg.id}`);
                }}
            />
        </div>
    );
}
