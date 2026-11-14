import { createSignal, For, Match, Show, Switch } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { useQuery, useQueryClient } from '@tanstack/solid-query';
import { IconPlus } from '@shared/ui/icons';
import { usePageMeta } from '@shared/meta/page-meta';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import { useDateFormat } from '@shared/lib/date-format';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import EmptyState from '@shared/ui/EmptyState';
import ErrorSummary from '@shared/ui/ErrorSummary';
import LoadError from '@shared/ui/LoadError';
import PageHeader from '@shared/ui/PageHeader';
import { myPackagesQuery, packageKeys } from './api/packages';
import ImportWorkflowButton from './components/ImportWorkflowButton';
import PackageEditorModal from './components/PackageEditorModal';
import PackageOrigin from './components/PackageOrigin';
import VisibilityBadge from './components/VisibilityBadge';
import { packagePath } from './package-nav';
import './packages.scss';
import './workflows.scss';

/**
 * The user's packages, where their workflows live (made here or installed
 * from Explore), and the packages others shared with them.
 */
export default function PackagesPage() {
    const queryClient = useQueryClient();
    const t = useLocalizer('workflows');
    const navigate = useNavigate();

    usePageMeta(() => ({
        title: t('packages.title', 'Packages'),
        description: t(
            'packages.description',
            'Your packages: workflows that belong together.'
        ),
    }));

    const packages = useQuery(() => myPackagesQuery());
    const mine = () =>
        (packages.data ?? []).filter((p) => p.access === 'Owner');
    const shared = () =>
        (packages.data ?? []).filter((p) => p.access !== 'Owner');

    const [creating, setCreating] = createSignal(false);
    const [errors, setErrors] = createSignal<FormErrors>({});

    const date = useDateFormat();

    return (
        <div class="page-stack workflows-container">
            <PageHeader
                eyebrow={t('eyebrow', 'Workflows')}
                title={t('packages.title', 'Packages')}
                description={t(
                    'packages.lead',
                    'Workflows that belong together.'
                )}
                docs="packages"
                actions={
                    <>
                        <ImportWorkflowButton
                            onErrors={(e) => setErrors(groupErrors(e, []))}
                        />
                        <Button onClick={() => setCreating(true)}>
                            <IconPlus />
                            {t('ui.new_package', 'New package')}
                        </Button>
                    </>
                }
            />
            <ErrorSummary errors={errors()} />

            <Switch>
                <Match when={packages.isError && packages.error}>
                    {(error) => (
                        <LoadError
                            error={error()}
                            busy={packages.isFetching}
                            onRetry={() => packages.refetch()}
                        />
                    )}
                </Match>
                <Match when={packages.isSuccess}>
                    <Show
                        when={mine().length > 0}
                        fallback={
                            <EmptyState
                                action={
                                    <A class="btn" href="/explore">
                                        {t(
                                            'empty_explore',
                                            'Find one in Explore'
                                        )}
                                    </A>
                                }
                            >
                                {t(
                                    'packages.empty',
                                    'No packages yet: install one from Explore, start a new one or import a workflow.'
                                )}
                            </EmptyState>
                        }
                    >
                        <ul class="workflows-list">
                            <For each={mine()}>
                                {(p) => (
                                    <li class="workflows-item card">
                                        <span class="workflows-item-main">
                                            <span class="workflows-item-title">
                                                <A
                                                    href={packagePath(p.id)}
                                                    class="workflows-item-name"
                                                >
                                                    {p.name}
                                                </A>
                                                <VisibilityBadge
                                                    visibility={p.visibility}
                                                />
                                            </span>
                                            <Show when={p.summary}>
                                                <span class="muted">
                                                    {p.summary}
                                                </span>
                                            </Show>
                                            <span class="muted workflows-item-meta">
                                                <span>
                                                    {t(
                                                        'packages.count',
                                                        '{count} workflows',
                                                        { count: p.workflows }
                                                    )}
                                                </span>
                                                <PackageOrigin pkg={p} />
                                                <span>{date(p.updatedAt)}</span>
                                            </span>
                                        </span>
                                    </li>
                                )}
                            </For>
                        </ul>
                    </Show>

                    <Show when={shared().length > 0}>
                        <section class="workflow-section">
                            <h2>{t('packages.shared', 'Shared with you')}</h2>
                            <ul class="workflows-list">
                                <For each={shared()}>
                                    {(p) => (
                                        <li class="workflows-item card">
                                            <span class="workflows-item-main">
                                                <A
                                                    href={`/explore/${p.id}`}
                                                    class="workflows-item-name"
                                                >
                                                    {p.name}
                                                </A>
                                                <span class="muted workflows-item-meta">
                                                    <span>
                                                        {t(
                                                            'packages.by',
                                                            'by {name}',
                                                            {
                                                                name:
                                                                    p.owner
                                                                        .name ||
                                                                    `@${p.owner.userName ?? ''}`,
                                                            }
                                                        )}
                                                    </span>
                                                    <Show
                                                        when={
                                                            p.latestVersion > 0
                                                        }
                                                    >
                                                        <span>
                                                            v{p.latestVersion}
                                                        </span>
                                                    </Show>
                                                </span>
                                            </span>
                                        </li>
                                    )}
                                </For>
                            </ul>
                        </section>
                    </Show>
                </Match>
            </Switch>

            <PackageEditorModal
                open={creating()}
                onClose={() => setCreating(false)}
                onSaved={(p) => {
                    // Until step 9's createPackageMutation: the cache by hand.
                    queryClient.setQueryData(packageKeys.detail(p.id), p);
                    void queryClient.invalidateQueries({
                        queryKey: packageKeys.mine(),
                    });
                    setCreating(false);
                    navigate(packagePath(p.id));
                }}
            />
        </div>
    );
}
