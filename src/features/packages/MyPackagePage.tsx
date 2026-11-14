import { createEffect, createSignal, Match, Show, Switch } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { useQuery, useQueryClient } from '@tanstack/solid-query';
import { usePageMeta } from '@shared/meta/page-meta';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { isNotFound } from '@shared/api/client';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import type { WorkflowPackage, WorkflowSummary } from '@shared/api/types';
import BackLink from '@shared/ui/BackLink';
import EmptyState from '@shared/ui/EmptyState';
import ErrorSummary from '@shared/ui/ErrorSummary';
import LoadError from '@shared/ui/LoadError';
import PageHeader from '@shared/ui/PageHeader';
import { NavTabs } from '@shared/ui/Tabs';
import { packageKeys, packageWorkflowsQuery } from './api/packages';
import ImportWorkflowButton from './components/ImportWorkflowButton';
import PackageOrigin from './components/PackageOrigin';
import PackageSettings from './components/PackageSettings';
import PackageWorkflowList from './components/PackageWorkflowList';
import RunList from './components/RunList';
import VisibilityBadge from './components/VisibilityBadge';
import { packagePath, usePackage } from './package-nav';
import './packages.scss';
import './workflows.scss';

type Section = 'workflows' | 'runs' | 'settings';
const SECTIONS: Section[] = ['workflows', 'runs', 'settings'];

/**
 * /packages/:id/:section: one of the user's packages, its workflows, the
 * runs of all of them, or its settings. Someone else's goes to its Explore page.
 */
export default function MyPackagePage() {
    const params = useParams<{ id: string; section?: string }>();
    const t = useLocalizer('workflows');
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const section = (): Section =>
        SECTIONS.includes(params.section as Section)
            ? (params.section as Section)
            : 'workflows';
    const pkg = usePackage(() => params.id);
    // Only its owner lists its workflows.
    const workflows = useQuery(() => ({
        ...packageWorkflowsQuery(params.id),
        enabled: pkg.data?.access === 'Owner',
    }));

    createEffect(() => {
        const p = pkg.data;
        if (p && p.access !== 'Owner')
            navigate(`/explore/${p.id}`, { replace: true });
    });
    usePageMeta(() => ({
        title: pkg.data?.name ?? t('packages.title', 'Packages'),
        description:
            pkg.data?.summary ||
            t(
                'packages.description',
                'Your packages: workflows that belong together.'
            ),
    }));

    const [errors, setErrors] = createSignal<FormErrors>({});

    const names = () =>
        Object.fromEntries((workflows.data ?? []).map((w) => [w.id, w.name]));

    // Until step 9's mutations: a save puts the package the server answered
    // in the cache; the list of packages, and Explore when who sees it
    // changed, are asked again.
    function saved(before: WorkflowPackage, after: WorkflowPackage) {
        queryClient.setQueryData(packageKeys.detail(after.id), after);
        void queryClient.invalidateQueries({ queryKey: packageKeys.mine() });
        if (before.visibility !== after.visibility)
            void queryClient.invalidateQueries({
                queryKey: packageKeys.exploreLists(),
            });
    }

    // A workflow switched on or off: its row changes at once.
    function changed(workflow: WorkflowSummary) {
        queryClient.setQueryData(
            packageKeys.workflows(params.id),
            (list: WorkflowSummary[] | undefined) =>
                list?.map((w) => (w.id === workflow.id ? workflow : w))
        );
    }

    const back = () => (
        <BackLink href="/packages" label={t('packages.title', 'Packages')} />
    );

    return (
        <Switch
            fallback={
                <>
                    {back()}
                    <EmptyState>
                        {t(
                            'package.not_found',
                            'This package does not exist, or it is not yours.'
                        )}
                    </EmptyState>
                </>
            }
        >
            <Match when={pkg.data}>
                {(p) => (
                    <div class="page-stack workflow-page">
                        {back()}
                        <PageHeader
                            eyebrow={t('package.eyebrow', 'Package')}
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
                                <span class="workflow-meta">
                                    <PackageOrigin pkg={p()} />
                                </span>
                            }
                        />

                        <div class="workflow-tabs-row">
                            <NavTabs
                                label={t('package.sections', 'Package')}
                                value={section()}
                                tabs={SECTIONS.map((name) => ({
                                    value: name,
                                    label: t(`package.${name}`, name),
                                    href: packagePath(
                                        p().id,
                                        name === 'workflows' ? undefined : name
                                    ),
                                }))}
                            />
                            <Show when={section() === 'workflows'}>
                                <span class="workflow-tabs-actions">
                                    <ImportWorkflowButton
                                        packageId={p().id}
                                        onErrors={(e) =>
                                            setErrors(groupErrors(e, []))
                                        }
                                    />
                                </span>
                            </Show>
                        </div>
                        <ErrorSummary errors={errors()} />

                        <Show when={section() === 'workflows'}>
                            <PackageWorkflowList
                                pkg={p()}
                                workflows={workflows.data ?? []}
                                loading={!workflows.isSuccess}
                                onChange={changed}
                            />
                        </Show>
                        <Show when={section() === 'runs'}>
                            <RunList packageId={p().id} names={names()} />
                        </Show>
                        <Show when={section() === 'settings'}>
                            <PackageSettings
                                pkg={p()}
                                workflows={workflows.data ?? []}
                                onSaved={(after) => saved(p(), after)}
                            />
                        </Show>
                    </div>
                )}
            </Match>
            <Match when={pkg.isPending}>{null}</Match>
            <Match when={pkg.isError && !isNotFound(pkg.error) && pkg.error}>
                {(error) => (
                    <div class="page-stack">
                        {back()}
                        <LoadError
                            error={error()}
                            busy={pkg.isFetching}
                            onRetry={() => pkg.refetch()}
                        />
                    </div>
                )}
            </Match>
        </Switch>
    );
}
