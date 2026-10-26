import {
    createEffect,
    createRenderEffect,
    createResource,
    createSignal,
    For,
    Show,
} from 'solid-js';
import { A, useNavigate, useParams } from '@solidjs/router';
import { AiOutlineArrowLeft } from 'solid-icons/ai';
import { useRootMeta } from '@shared/meta/page-meta';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import EmptyState from '@shared/ui/EmptyState';
import ErrorSummary from '@shared/ui/ErrorSummary';
import PageHeader from '@shared/ui/PageHeader';
import { listWorkflows } from './api';
import ImportWorkflowButton from './components/ImportWorkflowButton';
import PackageSettings from './components/PackageSettings';
import PackageWorkflowList from './components/PackageWorkflowList';
import RunList from './components/RunList';
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
    const { setTitle, setDescription } = useRootMeta();

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
    createRenderEffect(() => {
        setTitle(
            `${pkg()?.name ?? t('packages.title', 'Packages')} · EchoPhase`
        );
        setDescription(
            pkg()?.summary ||
                t(
                    'packages.description',
                    'Your packages: workflows that belong together.'
                )
        );
    });

    const [errors, setErrors] = createSignal<FormErrors>({});

    const names = () =>
        Object.fromEntries((workflows() ?? []).map((w) => [w.id, w.name]));

    const back = (
        <A href="/packages" class="workflow-back">
            <AiOutlineArrowLeft aria-hidden="true" />{' '}
            {t('packages.title', 'Packages')}
        </A>
    );

    return (
        <Show
            when={pkg()}
            fallback={
                <Show when={!pkg.loading}>
                    {back}
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
                <div class="workflow-page">
                    {back}
                    <PageHeader
                        eyebrow={t('package.eyebrow', 'Package')}
                        title={p().name}
                        description={p().summary || undefined}
                        meta={
                            <span class="workflow-meta">
                                <Show when={p().source}>
                                    {(source) => (
                                        <A
                                            class="workflow-badge"
                                            href={`/explore/${source().packageId}`}
                                        >
                                            {t(
                                                'packages.installed',
                                                'installed, v{version}'
                                            ).replace(
                                                '{version}',
                                                String(source().version ?? '')
                                            )}
                                        </A>
                                    )}
                                </Show>
                                <Show when={p().latestVersion > 0}>
                                    <A
                                        class="workflow-badge"
                                        href={`/explore/${p().id}`}
                                    >
                                        {t(
                                            'packages.published',
                                            'published, v{version}'
                                        ).replace(
                                            '{version}',
                                            String(p().latestVersion)
                                        )}
                                    </A>
                                </Show>
                            </span>
                        }
                    />

                    <div class="workflow-tabs-row">
                        <nav
                            class="workflow-tabs"
                            aria-label={t('package.sections', 'Package')}
                        >
                            <For each={SECTIONS}>
                                {(name) => (
                                    <A
                                        class="workflow-tab"
                                        href={packagePath(
                                            p().id,
                                            name === 'workflows'
                                                ? undefined
                                                : name
                                        )}
                                        aria-current={
                                            section() === name
                                                ? 'page'
                                                : undefined
                                        }
                                    >
                                        {t(`package.${name}`, name)}
                                    </A>
                                )}
                            </For>
                        </nav>
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
                    <ErrorSummary errors={errors()} inputId={() => ''} />

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
