import {
    createRenderEffect,
    createResource,
    createSignal,
    For,
    Show,
} from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { AiOutlinePlus } from 'solid-icons/ai';
import { useRootMeta } from '@shared/meta/page-meta';
import { useAuth } from '@shared/api/auth-provider';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import { DateHelper } from '@shared/lib/date-helper';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import EmptyState from '@shared/ui/EmptyState';
import ErrorSummary from '@shared/ui/ErrorSummary';
import PageHeader from '@shared/ui/PageHeader';
import { myPackages } from './api';
import ImportWorkflowButton from './components/ImportWorkflowButton';
import PackageEditorModal from './components/PackageEditorModal';
import { packagePath } from './package-nav';
import './packages.scss';
import './workflows.scss';

/**
 * The user's packages, where their workflows live (made here or installed
 * from Explore), and the packages others shared with them.
 */
export default function PackagesPage() {
    const { setTitle, setDescription } = useRootMeta();
    const { isAuthenticated, user } = useAuth();
    const t = useLocalizer('workflows');
    const i18n = useI18n();
    const navigate = useNavigate();

    createRenderEffect(() => {
        setTitle(`${t('packages.title', 'Packages')} · EchoPhase`);
        setDescription(
            t(
                'packages.description',
                'Your packages: workflows that belong together.'
            )
        );
    });

    const [packages] = createResource(
        () => isAuthenticated() || false,
        myPackages
    );
    const mine = () => (packages() ?? []).filter((p) => p.access === 'Owner');
    const shared = () => (packages() ?? []).filter((p) => p.access !== 'Owner');

    const [creating, setCreating] = createSignal(false);
    const [errors, setErrors] = createSignal<FormErrors>({});

    const date = (iso: string) =>
        DateHelper.format(iso, user()?.timeZone, i18n.currentLocale());

    return (
        <div class="workflows-container">
            <PageHeader
                eyebrow={t('eyebrow', 'Workflows')}
                title={t('packages.title', 'Packages')}
                description={t(
                    'packages.lead',
                    'Workflows that belong together.'
                )}
                more={t(
                    'packages.more',
                    'They call each other, share their storage and are published together. Install one from Explore, or start your own.'
                )}
                actions={
                    <>
                        <ImportWorkflowButton
                            onErrors={(e) => setErrors(groupErrors(e, []))}
                        />
                        <Button onClick={() => setCreating(true)}>
                            <AiOutlinePlus />
                            {t('packages.new', 'New package')}
                        </Button>
                    </>
                }
            />
            <ErrorSummary errors={errors()} inputId={() => ''} />

            <Show
                when={mine().length > 0}
                fallback={
                    <Show when={!packages.loading}>
                        <EmptyState
                            action={
                                <A class="btn" href="/explore">
                                    {t('empty_explore', 'Find one in Explore')}
                                </A>
                            }
                        >
                            {t(
                                'packages.empty',
                                'No packages yet: install one from Explore, start a new one or import a workflow.'
                            )}
                        </EmptyState>
                    </Show>
                }
            >
                <ul class="workflows-list">
                    <For each={mine()}>
                        {(p) => (
                            <li class="workflows-item card">
                                <span class="workflows-item-main">
                                    <A
                                        href={packagePath(p.id)}
                                        class="workflows-item-name"
                                    >
                                        {p.name}
                                    </A>
                                    <Show when={p.summary}>
                                        <span class="muted">{p.summary}</span>
                                    </Show>
                                    <span class="muted workflows-item-meta">
                                        <span>
                                            {t(
                                                'packages.count',
                                                '{count} workflows'
                                            ).replace(
                                                '{count}',
                                                String(p.workflows)
                                            )}
                                        </span>
                                        <Show when={p.source}>
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
                                                        String(
                                                            source().version ??
                                                                ''
                                                        )
                                                    )}
                                                </A>
                                            )}
                                        </Show>
                                        <Show when={p.latestVersion > 0}>
                                            <A
                                                class="workflow-badge"
                                                href={`/explore/${p.id}`}
                                            >
                                                {t(
                                                    'packages.published',
                                                    'published, v{version}'
                                                ).replace(
                                                    '{version}',
                                                    String(p.latestVersion)
                                                )}
                                            </A>
                                        </Show>
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
                                                    'by {name}'
                                                ).replace(
                                                    '{name}',
                                                    p.owner.name ||
                                                        `@${p.owner.userName ?? ''}`
                                                )}
                                            </span>
                                            <Show when={p.latestVersion > 0}>
                                                <span>v{p.latestVersion}</span>
                                            </Show>
                                        </span>
                                    </span>
                                </li>
                            )}
                        </For>
                    </ul>
                </section>
            </Show>

            <PackageEditorModal
                open={creating()}
                onClose={() => setCreating(false)}
                onSaved={(p) => {
                    setCreating(false);
                    navigate(packagePath(p.id));
                }}
            />
        </div>
    );
}
