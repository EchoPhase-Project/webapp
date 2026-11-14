import { createSignal, Show } from 'solid-js';
import { A, useSearchParams } from '@solidjs/router';
import { usePageMeta } from '@shared/meta/page-meta';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { createDebounced } from '@shared/lib/debounced';
import { createPagedList } from '@shared/lib/paged-list';
import Button from '@shared/ui/Button';
import EmptyState from '@shared/ui/EmptyState';
import LoadError from '@shared/ui/LoadError';
import Masonry from '@shared/ui/Masonry';
import PageHeader from '@shared/ui/PageHeader';
import { explorePackagesInfiniteQuery } from './api';
import PackageCard from './components/PackageCard';
import PackageSearch, { parseQuery, queryOf } from './components/PackageSearch';
import './packages.scss';

/** Published packages, everyone's public ones: to read and install. The caller's own are in Packages. */
export default function ExplorePage() {
    const t = useLocalizer('packages');
    const [params, setParams] = useSearchParams<{ tag?: string }>();

    usePageMeta(() => ({
        title: t('title', 'Explore'),
        description: t('description', 'Workflow packages to read and install.'),
    }));

    const tag = () => params.tag ?? '';

    // The line as typed: words and `tag:name`; the tag lives in the address too.
    const [query, setQuery] = createSignal(queryOf(params.tag ?? '', ''));
    // The words, once typing pauses.
    const [search, setSearch] = createSignal('');
    const debounce = createDebounced(250);
    const onSearch = (value: string, now = false) => {
        setQuery(value);
        const apply = () => {
            const parsed = parseQuery(value);
            setSearch(parsed.words);
            if (parsed.tag !== tag())
                setParams({ tag: parsed.tag || undefined });
        };
        if (now) {
            debounce.cancel();
            apply();
        } else debounce(apply);
    };
    // A tag picked on a card goes into the line, with the words kept.
    const pickTag = (picked: string) =>
        onSearch(queryOf(picked, parseQuery(query()).words), true);

    // Another search or tag is another list: the request for the old one
    // is cancelled.
    const packages = createPagedList(() =>
        explorePackagesInfiniteQuery(search(), tag())
    );

    return (
        <div class="page-stack packages-container">
            <PageHeader
                eyebrow={t('eyebrow', 'Workflows')}
                title={t('title', 'Explore')}
                description={t(
                    'lead',
                    'Packages others published, to install.'
                )}
                docs="explore"
                actions={
                    <A class="btn btn-ghost" href="/packages">
                        {t('yours', 'Your packages')}
                    </A>
                }
            />

            <PackageSearch value={query()} onInput={onSearch} />

            <Show when={packages.error()}>
                {(error) => (
                    <LoadError
                        error={error()}
                        busy={packages.retrying()}
                        onRetry={packages.retry}
                    />
                )}
            </Show>

            <Show
                when={packages.items().length > 0}
                fallback={
                    <Show when={packages.loaded()}>
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
                <Masonry each={packages.items()}>
                    {(pkg) => <PackageCard pkg={pkg} onTag={pickTag} />}
                </Masonry>
                <Show when={packages.more()}>
                    <div class="packages-more" ref={packages.watchEnd}>
                        <Button
                            variant="ghost"
                            busy={packages.loading()}
                            onClick={() => packages.loadMore()}
                        >
                            {t('ui.show_more', 'Show more')}
                        </Button>
                    </div>
                </Show>
            </Show>
        </div>
    );
}
