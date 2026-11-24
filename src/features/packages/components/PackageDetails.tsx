import { createSignal, For, Show } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { useQuery } from '@tanstack/solid-query';
import { IconDownload } from '@shared/ui/icons';
import { useAuth } from '@shared/api/auth';
import { isNotFound } from '@shared/api/client';
import { createSubmit } from '@shared/api/submit';
import { usePageMeta } from '@shared/meta/page-meta';
import { useDateFormat } from '@shared/lib/date-format';
import { useLocalizer } from '@shared/i18n/i18n-context';
import BackLink from '@shared/ui/BackLink';
import Button, { LinkButton } from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/forms/ErrorSummary';
import InlineList from '@shared/ui/InlineList';
import LoadError from '@shared/ui/LoadError';
import Markdown from '@shared/ui/Markdown';
import PageHeader from '@shared/ui/PageHeader';
import QueryState from '@shared/ui/QueryState';
import {
    leavePackageMutation,
    packageContentQuery,
    packageQuery,
    packageVersionsQuery,
} from '@features/packages/api/packages';
import { packagePath } from '@features/packages/package-nav';
import { tagClass } from '@features/packages/tags';
import InstallModal from './InstallModal';
import VisibilityBadge from './VisibilityBadge';

/**
 * One published package: its README, what its latest version holds, its
 * versions, and installing it. Its owner manages it in Packages.
 */
export default function PackageDetails(props: { id: string }) {
    const t = useLocalizer('packages');
    const { user } = useAuth();
    const navigate = useNavigate();

    // The three at once: the package, its latest version (none before the
    // first publish: a 404, nothing to install), its versions.
    const pkg = useQuery(() => packageQuery(props.id));
    const content = useQuery(() => packageContentQuery(props.id));
    const versions = useQuery(() => packageVersionsQuery(props.id));

    const [installing, setInstalling] = createSignal(false);
    const leaving = createSubmit();
    const leaveShared = leaving.mutation(leavePackageMutation);
    usePageMeta(() => ({
        title: pkg.data?.name ?? t('title', 'Explore'),
        description:
            pkg.data?.summary ||
            t('description', 'Workflow packages to read and install.'),
    }));

    const isOwner = () => pkg.data?.access === 'Owner';
    const date = useDateFormat();

    // A failure shows above the button.
    function leave() {
        return leaveShared.run({ id: props.id, userId: user()?.id ?? '' }, () =>
            navigate('/packages')
        );
    }

    const back = () => (
        <BackLink href="/explore" label={t('back', 'Explore')} />
    );

    return (
        <div class="page-stack package-page">
            {back()}
            <QueryState
                query={pkg}
                notFound={t(
                    'not_found',
                    'This package does not exist, or it is not shared with you.'
                )}
            >
                {(p) => (
                    <>
                        <PageHeader
                            eyebrow={t('eyebrow', 'Workflows')}
                            title={
                                <>
                                    {p().name}{' '}
                                    <VisibilityBadge
                                        visibility={p().visibility}
                                    />
                                </>
                            }
                            description={p().summary || undefined}
                            meta={
                                <InlineList
                                    items={[
                                        t('by', 'by {name}', {
                                            name:
                                                p().owner.name ||
                                                `@${p().owner.userName ?? ''}`,
                                        }),
                                        t('card.installs', '{count} installs', {
                                            count: p().installs,
                                        }),
                                        t('updated', 'updated {date}', {
                                            date: date(p().updatedAt),
                                        }),
                                    ]}
                                />
                            }
                            actions={
                                <Button
                                    disabled={!content.data}
                                    onClick={() => setInstalling(true)}
                                >
                                    <IconDownload />
                                    {t('install.open', 'Install')}
                                </Button>
                            }
                        />

                        <Show when={p().tags.length > 0}>
                            <ul
                                class="package-tags"
                                aria-label={t('ui.tags', 'Tags')}
                            >
                                <For each={p().tags}>
                                    {(tag) => (
                                        <li>
                                            <A
                                                class={tagClass(tag)}
                                                href={`/explore?tag=${encodeURIComponent(tag)}`}
                                            >
                                                {tag}
                                            </A>
                                        </li>
                                    )}
                                </For>
                            </ul>
                        </Show>

                        <div class="package-layout">
                            <div class="package-readme-view card">
                                <Show
                                    when={p().readme.trim()}
                                    fallback={
                                        <p class="muted">
                                            {t('no_readme', 'No README.')}
                                        </p>
                                    }
                                >
                                    <Markdown text={p().readme} />
                                </Show>
                            </div>

                            <aside class="package-side">
                                <Show when={isOwner()}>
                                    <section class="actions-row">
                                        <LinkButton
                                            variant="ghost"
                                            href={packagePath(
                                                p().id,
                                                'settings'
                                            )}
                                        >
                                            {t(
                                                'manage',
                                                'Manage it in your packages'
                                            )}
                                        </LinkButton>
                                    </section>
                                </Show>

                                <Show
                                    when={
                                        content.isError &&
                                        !isNotFound(content.error) &&
                                        content.error
                                    }
                                >
                                    {(error) => (
                                        <LoadError
                                            error={error()}
                                            busy={content.isFetching}
                                            onRetry={() => content.refetch()}
                                        />
                                    )}
                                </Show>
                                <Show when={content.data}>
                                    {(c) => (
                                        <>
                                            <section class="package-side-section">
                                                <h2>
                                                    {t(
                                                        'workflows',
                                                        'Workflows in version {version}',
                                                        { version: c().version }
                                                    )}
                                                </h2>
                                                <ul class="package-list">
                                                    <For each={c().workflows}>
                                                        {(w) => (
                                                            <li>
                                                                <span>
                                                                    {w.name}
                                                                </span>
                                                                <Show
                                                                    when={
                                                                        w.main
                                                                    }
                                                                >
                                                                    <span class="badge">
                                                                        {t(
                                                                            'editor.main',
                                                                            'main'
                                                                        )}
                                                                    </span>
                                                                </Show>
                                                                <span class="muted">
                                                                    {t(
                                                                        'blocks',
                                                                        '{count} blocks',
                                                                        {
                                                                            count: w
                                                                                .program
                                                                                .blocks
                                                                                .length,
                                                                        }
                                                                    )}
                                                                </span>
                                                            </li>
                                                        )}
                                                    </For>
                                                </ul>
                                            </section>
                                            <Show
                                                when={
                                                    c().connections.length > 0
                                                }
                                            >
                                                <section class="package-side-section">
                                                    <h2>
                                                        {t(
                                                            'install.connections',
                                                            'Connections they use'
                                                        )}
                                                    </h2>
                                                    <ul class="package-list">
                                                        <For
                                                            each={
                                                                c().connections
                                                            }
                                                        >
                                                            {(needed) => (
                                                                <li>
                                                                    <span>
                                                                        {
                                                                            needed.name
                                                                        }
                                                                    </span>
                                                                    <Show
                                                                        when={
                                                                            needed.provider
                                                                        }
                                                                    >
                                                                        {(
                                                                            provider
                                                                        ) => (
                                                                            <span class="muted">
                                                                                {provider()}
                                                                            </span>
                                                                        )}
                                                                    </Show>
                                                                </li>
                                                            )}
                                                        </For>
                                                    </ul>
                                                </section>
                                            </Show>
                                        </>
                                    )}
                                </Show>

                                <section class="package-side-section">
                                    <h2>{t('versions', 'Versions')}</h2>
                                    <QueryState query={versions}>
                                        {(list) => (
                                            <ol class="package-versions">
                                                <For each={list()}>
                                                    {(v) => (
                                                        <li>
                                                            <span class="package-version-head">
                                                                <strong>
                                                                    v{v.version}
                                                                </strong>
                                                                <span class="muted">
                                                                    {date(
                                                                        v.createdAt
                                                                    )}
                                                                </span>
                                                            </span>
                                                            <Show
                                                                when={v.changelog.trim()}
                                                            >
                                                                <Markdown
                                                                    text={
                                                                        v.changelog
                                                                    }
                                                                    class="package-changelog"
                                                                />
                                                            </Show>
                                                        </li>
                                                    )}
                                                </For>
                                            </ol>
                                        )}
                                    </QueryState>
                                </section>

                                <Show
                                    when={
                                        !isOwner() &&
                                        p().visibility === 'Private'
                                    }
                                >
                                    <ErrorSummary errors={leaving.errors()} />
                                    <Button
                                        variant="ghost"
                                        disabled={leaving.busy()}
                                        onClick={() => void leave()}
                                    >
                                        {t('leave', 'Leave this package')}
                                    </Button>
                                </Show>
                            </aside>
                        </div>

                        <Show when={content.data}>
                            {(c) => (
                                <InstallModal
                                    open={installing()}
                                    packageId={p().id}
                                    content={c()}
                                    onClose={() => setInstalling(false)}
                                />
                            )}
                        </Show>
                    </>
                )}
            </QueryState>
        </div>
    );
}
