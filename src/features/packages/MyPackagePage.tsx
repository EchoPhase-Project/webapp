import { createEffect, createResource, createSignal, Show } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { usePageMeta } from '@shared/meta/page-meta';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import BackLink from '@shared/ui/BackLink';
import EmptyState from '@shared/ui/EmptyState';
import ErrorSummary from '@shared/ui/ErrorSummary';
import PageHeader from '@shared/ui/PageHeader';
import { NavTabs } from '@shared/ui/Tabs';
import { listWorkflows } from './api/workflows';
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

    const section = (): Section =>
        SECTIONS.includes(params.section as Section)
            ? (params.section as Section)
            : 'workflows';
    const [pkg, { mutate }] = usePackage(() => params.id);
    const [workflows, workflowActions] = createResource(
        () => (pkg()?.access === 'Owner' ? params.id : false),
        listWorkflows
    );

    createEffect(() => {
        const p = pkg();
        if (p && p.access !== 'Owner')
            navigate(`/explore/${p.id}`, { replace: true });
    });
    usePageMeta(() => ({
        title: pkg()?.name ?? t('packages.title', 'Packages'),
        description:
            pkg()?.summary ||
            t(
                'packages.description',
                'Your packages: workflows that belong together.'
            ),
    }));

    const [errors, setErrors] = createSignal<FormErrors>({});

    const names = () =>
        Object.fromEntries((workflows() ?? []).map((w) => [w.id, w.name]));

    const back = () => (
        <BackLink href="/packages" label={t('packages.title', 'Packages')} />
    );

    return (
        <Show
            when={pkg()}
            fallback={
                <Show when={!pkg.loading}>
                    {back()}
                    <EmptyState>
                        {t(
                            'package.not_found',
                            'This package does not exist, or it is not yours.'
                        )}
                    </EmptyState>
                </Show>
            }
        >
            {(p) => (
                <div class="page-stack workflow-page">
                    {back()}
                    <PageHeader
                        eyebrow={t('package.eyebrow', 'Package')}
                        title={
                            <>
                                {p().name}{' '}
                                <VisibilityBadge visibility={p().visibility} />
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
                            workflows={workflows() ?? []}
                            loading={workflows.loading}
                            onChange={(changed) =>
                                workflowActions.mutate((list) =>
                                    (list ?? []).map((w) =>
                                        w.id === changed.id ? changed : w
                                    )
                                )
                            }
                        />
                    </Show>
                    <Show when={section() === 'runs'}>
                        <RunList packageId={p().id} names={names()} />
                    </Show>
                    <Show when={section() === 'settings'}>
                        <PackageSettings
                            pkg={p()}
                            workflows={workflows() ?? []}
                            onSaved={(saved) => mutate(saved)}
                        />
                    </Show>
                </div>
            )}
        </Show>
    );
}
