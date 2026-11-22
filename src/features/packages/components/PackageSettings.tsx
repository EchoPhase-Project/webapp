import { createSignal, Show } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import type { WorkflowPackage, WorkflowSummary } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ConfirmDialog, { createConfirm } from '@shared/ui/ConfirmDialog';
import SettingsCard from '@shared/ui/SettingsCard';
import ShareList from '@shared/ui/ShareList';
import {
    deletePackageMutation,
    packageSharesQuery,
    sharePackageMutation,
    unsharePackageMutation,
} from '@features/packages/api/packages';
import ErrorWorkflowEditor from './ErrorWorkflowEditor';
import PackageEditorModal from './PackageEditorModal';
import PublishModal from './PublishModal';
import TagsEditor from './TagsEditor';
import VisibilityEditor from './VisibilityEditor';

/**
 * What a package is and does as a whole, each part with its own editor:
 * name and README, tags, who sees it, which workflow handles failed runs,
 * its published versions, who it is shared with; and deleting it.
 */
export default function PackageSettings(props: {
    pkg: WorkflowPackage;
    workflows: WorkflowSummary[];
}) {
    const t = useLocalizer('workflows');
    const tp = useLocalizer('packages');
    const navigate = useNavigate();
    const [editing, setEditing] = createSignal(false);
    const [publishing, setPublishing] = createSignal(false);
    // A failed delete shows in its dialog, which stays open.
    const removal = createConfirm(
        deletePackageMutation,
        (pkg: WorkflowPackage) => pkg.id,
        () => navigate('/packages')
    );

    const docs = (
        <A class="page-more" href="/docs/packages">
            {t('ui.more', 'Read more')}
        </A>
    );

    return (
        <div class="package-settings">
            <SettingsCard
                title={t('settings.general', 'General')}
                description={t(
                    'settings.general_hint',
                    'Its name, summary and README, as others read them.'
                )}
                actions={
                    <Button variant="ghost" onClick={() => setEditing(true)}>
                        {t('settings.edit', 'Edit')}
                    </Button>
                }
            >
                <p>
                    <strong>{props.pkg.name}</strong>
                    <span class="muted">
                        {' · '}
                        {props.pkg.summary ||
                            t('settings.no_summary', 'No summary yet.')}
                    </span>
                </p>
                <p class="muted">
                    {props.pkg.readme.trim()
                        ? t('settings.has_readme', 'Has a README.')
                        : t('settings.no_readme', 'No README yet.')}
                </p>
            </SettingsCard>

            <TagsEditor pkg={props.pkg} />

            <VisibilityEditor pkg={props.pkg} />

            <ErrorWorkflowEditor pkg={props.pkg} workflows={props.workflows} />

            <SettingsCard
                title={t('settings.publishing', 'Publishing')}
                description={
                    props.pkg.latestVersion > 0
                        ? t(
                              'settings.published',
                              'Published, latest v{version}.',
                              { version: props.pkg.latestVersion }
                          )
                        : t(
                              'settings.unpublished',
                              'Not published: only you see it.'
                          )
                }
                hint={
                    <Show when={props.pkg.latestVersion > 0} fallback={docs}>
                        <A href={`/explore/${props.pkg.id}`}>
                            {t('settings.open_explore', 'See it as others do')}
                        </A>
                    </Show>
                }
                actions={
                    <Button
                        disabled={props.workflows.length === 0}
                        onClick={() => setPublishing(true)}
                    >
                        {tp('publish.open', 'New version')}
                    </Button>
                }
            />

            <ShareList
                card
                id="package-share"
                title={tp('share.title', 'Shared with')}
                description={tp(
                    'share.description',
                    'They read it and install it, while it is private.'
                )}
                empty={tp('share.none', 'Nobody yet.')}
                removeLabel={(name) =>
                    tp('share.remove', 'Stop sharing with {name}', { name })
                }
                query={packageSharesQuery(props.pkg.id)}
                share={(queryClient) =>
                    sharePackageMutation(queryClient, props.pkg.id)
                }
                unshare={(queryClient) =>
                    unsharePackageMutation(queryClient, props.pkg.id)
                }
            />

            <SettingsCard
                danger
                title={t('settings.danger', 'Delete')}
                description={t(
                    'settings.delete_hint',
                    'Its workflows, versions and storage go with it.'
                )}
                actions={
                    <Button
                        variant="danger-outline"
                        disabled={removal.busy()}
                        onClick={() => removal.ask(props.pkg)}
                    >
                        {t('settings.delete', 'Delete this package')}
                    </Button>
                }
            />

            <PackageEditorModal
                open={editing()}
                pkg={props.pkg}
                onClose={() => setEditing(false)}
                onSaved={() => setEditing(false)}
            />
            <PublishModal
                open={publishing()}
                pkg={props.pkg}
                workflows={props.workflows}
                onClose={() => setPublishing(false)}
                onPublished={() => setPublishing(false)}
            />
            <ConfirmDialog
                {...removal.dialog}
                title={t('settings.delete_title', 'Delete this package?')}
                confirm={t('ui.delete', 'Delete')}
            >
                {t(
                    'settings.delete_body',
                    'Its workflows go with it, with their versions, schedules and storage; their webhooks stop answering. Its published versions go too; packages others installed from it stay theirs.'
                )}
            </ConfirmDialog>
        </div>
    );
}
