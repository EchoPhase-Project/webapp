import {
    createRenderEffect,
    createResource,
    createSignal,
    For,
    Show,
} from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { AiOutlineArrowLeft, AiOutlineDownload } from 'solid-icons/ai';
import { useAuth } from '@shared/api/auth-provider';
import { useRootMeta } from '@shared/meta/page-meta';
import type { WorkflowPackage } from '@shared/api/types';
import { DateHelper } from '@shared/lib/date-helper';
import { useI18n, useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import EmptyState from '@shared/ui/EmptyState';
import Markdown from '@shared/ui/Markdown';
import PageHeader from '@shared/ui/PageHeader';
import {
    deletePackage,
    getContent,
    getPackage,
    listVersions,
    unsharePackage,
} from '@features/packages/api';
import InstallModal from './InstallModal';
import PackageEditorModal from './PackageEditorModal';
import PackageShares from './PackageShares';
import PublishModal from './PublishModal';

/**
 * One package: its README, what its latest version holds, its versions,
 * and installing it; its owner also edits, publishes, shares and deletes.
 */
export default function PackageDetails(props: { id: string }) {
    const t = useLocalizer('packages');
    const i18n = useI18n();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [pkg, { mutate }] = createResource(
        () => props.id,
        async (id) => {
            const result = await getPackage(id);
            return result.ok ? result.data : null;
        }
    );
    const [content, { refetch: refetchContent }] = createResource(
        () => (pkg() ? props.id : false),
        async (id) => {
            const result = await getContent(id);
            return result.ok ? result.data : null;
        }
    );
    const [versions, { refetch: refetchVersions }] = createResource(
        () => (pkg() ? props.id : false),
        listVersions
    );

    const [installing, setInstalling] = createSignal(false);
    const [editing, setEditing] = createSignal(false);
    const [publishing, setPublishing] = createSignal(false);
    const [confirming, setConfirming] = createSignal(false);
    const [busy, setBusy] = createSignal(false);

    const { setTitle, setDescription } = useRootMeta();
    createRenderEffect(() => {
        setTitle(`${pkg()?.name ?? t('title', 'Explore')} · EchoPhase`);
        setDescription(
            pkg()?.summary ||
                t('description', 'Workflow packages to read and install.')
        );
    });

    const isOwner = () => pkg()?.access === 'Owner';
    const date = (iso: string) =>
        DateHelper.format(iso, user()?.timeZone, i18n.currentLocale());

    async function remove() {
        setBusy(true);
        try {
            const result = await deletePackage(props.id);
            if (result.ok) navigate('/explore?tab=mine');
        } finally {
            setBusy(false);
            setConfirming(false);
        }
    }

    async function leave() {
        setBusy(true);
        try {
            const result = await unsharePackage(props.id, user()?.id ?? '');
            if (result.ok) navigate('/explore?tab=mine');
        } finally {
            setBusy(false);
        }
    }

    const back = (
        <A href="/explore" class="package-back">
            <AiOutlineArrowLeft aria-hidden="true" /> {t('back', 'Explore')}
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
                            'not_found',
                            'This package does not exist, or it is not shared with you.'
                        )}
                    </EmptyState>
                </Show>
            }
        >
            {(p) => (
                <div class="package-page">
                    {back}
                    <PageHeader
                        eyebrow={t('eyebrow', 'Workflows')}
                        title={p().name}
                        description={p().summary || undefined}
                        meta={
                            <span class="package-meta">
                                <span>
                                    {t('by', 'by {name}').replace(
                                        '{name}',
                                        p().owner.name ||
                                            `@${p().owner.userName ?? ''}`
                                    )}
                                </span>
                                <span>
                                    {t(
                                        `visibility.${p().visibility}`,
                                        p().visibility
                                    )}
                                </span>
                                <span>
                                    {t(
                                        'card.installs',
                                        '{count} installs'
                                    ).replace('{count}', String(p().installs))}
                                </span>
                                <span>
                                    {t('updated', 'updated {date}').replace(
                                        '{date}',
                                        date(p().updatedAt)
                                    )}
                                </span>
                            </span>
                        }
                        actions={
                            <Button
                                disabled={!content()}
                                onClick={() => setInstalling(true)}
                            >
                                <AiOutlineDownload />
                                {t('install.open', 'Install')}
                            </Button>
                        }
                    />

                    <Show when={p().tags.length > 0}>
                        <ul
                            class="package-tags"
                            aria-label={t('card.tags', 'Tags')}
                        >
                            <For each={p().tags}>
                                {(tag) => (
                                    <li>
                                        <A
                                            class="package-tag"
                                            href={`/explore?tag=${encodeURIComponent(tag)}`}
                                        >
                                            #{tag}
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
                                <section class="package-side-section package-owner-actions">
                                    <Button
                                        variant="ghost"
                                        disabled={!content()}
                                        onClick={() => setPublishing(true)}
                                    >
                                        {t('publish.open', 'New version')}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => setEditing(true)}
                                    >
                                        {t('editor.open', 'Edit')}
                                    </Button>
                                    <Button
                                        variant="danger-outline"
                                        disabled={busy()}
                                        onClick={() => setConfirming(true)}
                                    >
                                        {t('delete.open', 'Delete')}
                                    </Button>
                                </section>
                            </Show>

                            <Show when={content()}>
                                {(c) => (
                                    <>
                                        <section class="package-side-section">
                                            <h2>
                                                {t(
                                                    'workflows',
                                                    'Workflows in version {version}'
                                                ).replace(
                                                    '{version}',
                                                    String(c().version)
                                                )}
                                            </h2>
                                            <ul class="package-list">
                                                <For each={c().workflows}>
                                                    {(w) => (
                                                        <li>
                                                            <span>
                                                                {w.name}
                                                            </span>
                                                            <Show when={w.main}>
                                                                <span class="package-badge">
                                                                    {t(
                                                                        'editor.main',
                                                                        'main'
                                                                    )}
                                                                </span>
                                                            </Show>
                                                            <span class="muted">
                                                                {t(
                                                                    'blocks',
                                                                    '{count} blocks'
                                                                ).replace(
                                                                    '{count}',
                                                                    String(
                                                                        w
                                                                            .program
                                                                            .blocks
                                                                            .length
                                                                    )
                                                                )}
                                                            </span>
                                                        </li>
                                                    )}
                                                </For>
                                            </ul>
                                        </section>
                                        <Show when={c().connections.length > 0}>
                                            <section class="package-side-section">
                                                <h2>
                                                    {t(
                                                        'install.connections',
                                                        'Connections they use'
                                                    )}
                                                </h2>
                                                <ul class="package-list">
                                                    <For each={c().connections}>
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
                                <ol class="package-versions">
                                    <For each={versions()}>
                                        {(v) => (
                                            <li>
                                                <span class="package-version-head">
                                                    <strong>
                                                        v{v.version}
                                                    </strong>
                                                    <span class="muted">
                                                        {date(v.createdAt)}
                                                    </span>
                                                </span>
                                                <Show when={v.changelog.trim()}>
                                                    <Markdown
                                                        text={v.changelog}
                                                        class="package-changelog"
                                                    />
                                                </Show>
                                            </li>
                                        )}
                                    </For>
                                </ol>
                            </section>

                            <Show when={isOwner()}>
                                <PackageShares packageId={p().id} />
                            </Show>
                            <Show
                                when={
                                    !isOwner() && p().visibility === 'Private'
                                }
                            >
                                <Button
                                    variant="ghost"
                                    disabled={busy()}
                                    onClick={() => void leave()}
                                >
                                    {t('leave', 'Leave this package')}
                                </Button>
                            </Show>
                        </aside>
                    </div>

                    <Show when={content()}>
                        {(c) => (
                            <InstallModal
                                open={installing()}
                                packageId={p().id}
                                content={c()}
                                onClose={() => {
                                    setInstalling(false);
                                    // The count may have grown.
                                    void getPackage(p().id).then(
                                        (r) => r.ok && mutate(r.data)
                                    );
                                }}
                            />
                        )}
                    </Show>
                    <PackageEditorModal
                        open={editing()}
                        pkg={p()}
                        onClose={() => setEditing(false)}
                        onSaved={(saved: WorkflowPackage) => {
                            mutate(saved);
                            setEditing(false);
                        }}
                    />
                    <PublishModal
                        open={publishing()}
                        packageId={p().id}
                        current={[...(content()?.workflows ?? [])]
                            .sort((a, b) => Number(b.main) - Number(a.main))
                            .map((w) => w.key)}
                        onClose={() => setPublishing(false)}
                        onPublished={(v) => {
                            setPublishing(false);
                            mutate({
                                ...p(),
                                latestVersion: v.version,
                                updatedAt: v.createdAt,
                            });
                            void refetchContent();
                            void refetchVersions();
                        }}
                    />
                    <ConfirmDialog
                        open={confirming()}
                        title={t('delete.title', 'Delete this package?')}
                        confirm={t('delete.confirm', 'Delete')}
                        busy={busy()}
                        onConfirm={() => void remove()}
                        onCancel={() => setConfirming(false)}
                    >
                        {t(
                            'delete.body',
                            'Its versions go with it and nobody can install it any more. Copies already installed stay with whoever installed them.'
                        )}
                    </ConfirmDialog>
                </div>
            )}
        </Show>
    );
}
