import { createSignal, Show } from 'solid-js';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import type { PackageVersion } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import Modal from '@shared/ui/Modal';
import { publishVersion } from '@features/packages/api';
import WorkflowPicker from './WorkflowPicker';

const FIELDS = ['workflows', 'changelog'] as const;
const inputId = (field: string) => `package-publish-${field}`;

/**
 * A new version from the owner's workflows as they are now; the workflows
 * of the current one are ticked to start with.
 */
export default function PublishModal(props: {
    open: boolean;
    packageId: string;
    /** The current version's workflows (their keys are the owner's workflow ids), main first. */
    current: string[];
    onClose: () => void;
    onPublished: (version: PackageVersion) => void;
}) {
    const t = useLocalizer('packages');
    return (
        <Modal
            open={props.open}
            title={t('publish.title', 'Publish a new version')}
            onClose={() => props.onClose()}
            wide
        >
            <Show when={props.open}>
                <PublishForm
                    packageId={props.packageId}
                    current={props.current}
                    onPublished={(v) => props.onPublished(v)}
                />
            </Show>
        </Modal>
    );
}

function PublishForm(props: {
    packageId: string;
    current: string[];
    onPublished: (version: PackageVersion) => void;
}) {
    const t = useLocalizer('packages');
    // eslint-disable-next-line solid/reactivity
    const [workflows, setWorkflows] = createSignal<string[]>(props.current);
    const [changelog, setChangelog] = createSignal('');
    const [errors, setErrors] = createSignal<FormErrors>({});
    const [unchanged, setUnchanged] = createSignal(false);
    const [busy, setBusy] = createSignal(false);

    async function publish(e: Event) {
        e.preventDefault();
        if (busy()) return;
        setBusy(true);
        try {
            const result = await publishVersion(props.packageId, {
                workflows: workflows(),
                changelog: changelog(),
            });
            const conflict =
                !result.ok && result.errors.some((e) => e.code === 'Conflict');
            setUnchanged(conflict);
            if (!result.ok) {
                setErrors(conflict ? {} : groupErrors(result.errors, FIELDS));
                return;
            }
            setErrors({});
            props.onPublished(result.data);
        } finally {
            setBusy(false);
        }
    }

    return (
        <form class="vert-form" onSubmit={(e) => void publish(e)} noValidate>
            <ErrorSummary errors={errors()} inputId={inputId} />
            <Show when={unchanged()}>
                <p class="package-notice" role="alert">
                    {t(
                        'publish.unchanged',
                        'Nothing changed since the latest version: edit the workflows first, or choose others.'
                    )}
                </p>
            </Show>
            <WorkflowPicker
                id={inputId('workflows')}
                selected={workflows()}
                onChange={setWorkflows}
                disabled={busy()}
                errors={errors().workflows}
            />
            <label class="field-label" for={inputId('changelog')}>
                {t('publish.changelog', 'What changed (Markdown, optional)')}
            </label>
            <textarea
                id={inputId('changelog')}
                name="changelog"
                class="package-textarea package-textarea-short"
                rows={4}
                maxLength={10000}
                disabled={busy()}
                value={changelog()}
                onInput={(e) => setChangelog(e.currentTarget.value)}
            />
            <div class="package-actions">
                <Button type="submit" busy={busy()}>
                    {t('publish.submit', 'Publish')}
                </Button>
            </div>
        </form>
    );
}
