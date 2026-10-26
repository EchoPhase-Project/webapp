import { createResource, createSignal, For, Show } from 'solid-js';
import { groupErrors, type FormErrors } from '@shared/api/errors';
import type {
    PackageVersion,
    Workflow,
    WorkflowPackage,
    WorkflowSummary,
} from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';
import FieldError, { errorId } from '@shared/ui/FieldError';
import Modal from '@shared/ui/Modal';
import { getWorkflow, publishVersion } from '@features/packages/api';

const FIELDS = ['workflows', 'changelog'] as const;
const inputId = (field: string) => `package-publish-${field}`;

/** The keys of the workflows a program calls (ExecuteWorkflow). */
export function callsOf(workflow: Workflow): string[] {
    return workflow.program.blocks
        .filter((b) => b.type === 'ExecuteWorkflow')
        .map((b) => (b.params as { workflow?: unknown } | null)?.workflow)
        .filter((key): key is string => typeof key === 'string');
}

/** What a choice leaves out that a chosen workflow needs: one line each. */
export interface Missing {
    /** The workflow that needs it; null: the package (its error workflow). */
    by: string | null;
    needs: string;
}

export function missingOf(
    chosen: string[],
    workflows: Workflow[],
    errorWorkflow: string | null | undefined
): Missing[] {
    const byKey = new Map(workflows.map((w) => [w.key, w]));
    const chosenKeys = new Set(
        workflows.filter((w) => chosen.includes(w.id)).map((w) => w.key)
    );
    const missing: Missing[] = [];
    for (const w of workflows.filter((w) => chosen.includes(w.id)))
        for (const key of new Set(callsOf(w)))
            if (!chosenKeys.has(key))
                missing.push({
                    by: w.name,
                    needs: byKey.get(key)?.name ?? key,
                });
    if (errorWorkflow && !chosenKeys.has(errorWorkflow))
        missing.push({
            by: null,
            needs: byKey.get(errorWorkflow)?.name ?? errorWorkflow,
        });
    return missing;
}

/**
 * A new version from the package's workflows as they are now: all of them
 * to start with, or some, as long as what a chosen one calls (and the
 * error workflow) is chosen too.
 */
export default function PublishModal(props: {
    open: boolean;
    pkg: WorkflowPackage;
    workflows: WorkflowSummary[];
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
                    pkg={props.pkg}
                    workflows={props.workflows}
                    onPublished={(v) => props.onPublished(v)}
                />
            </Show>
        </Modal>
    );
}

function PublishForm(props: {
    pkg: WorkflowPackage;
    workflows: WorkflowSummary[];
    onPublished: (version: PackageVersion) => void;
}) {
    const t = useLocalizer('packages');
    // eslint-disable-next-line solid/reactivity
    const [chosen, setChosen] = createSignal(props.workflows.map((w) => w.id));
    const [changelog, setChangelog] = createSignal('');
    const [errors, setErrors] = createSignal<FormErrors>({});
    const [unchanged, setUnchanged] = createSignal(false);
    const [busy, setBusy] = createSignal(false);

    // Their programs: what each calls.
    const [programs] = createResource(
        () => props.workflows.map((w) => w.id),
        async (ids) => {
            const results = await Promise.all(ids.map(getWorkflow));
            return results.flatMap((r) => (r.ok ? [r.data] : []));
        }
    );
    const missing = () =>
        missingOf(chosen(), programs() ?? [], props.pkg.errorWorkflow);

    const toggle = (id: string, on: boolean) =>
        setChosen((list) =>
            on ? [...list, id] : list.filter((c) => c !== id)
        );

    async function publish(e: Event) {
        e.preventDefault();
        if (busy() || missing().length > 0 || chosen().length === 0) return;
        setBusy(true);
        try {
            const result = await publishVersion(props.pkg.id, {
                workflows: chosen(),
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
            <fieldset
                id={inputId('workflows')}
                class="package-picker"
                aria-invalid={!!errors().workflows?.length}
                aria-describedby={
                    errors().workflows?.length
                        ? errorId(inputId('workflows'))
                        : undefined
                }
            >
                <legend class="field-label">
                    {t(
                        'publish.workflows',
                        'Workflows in this version (the first ticked opens first)'
                    )}
                </legend>
                <ul class="package-picker-list">
                    <For each={props.workflows}>
                        {(workflow) => {
                            const order = () => chosen().indexOf(workflow.id);
                            return (
                                <li>
                                    <label class="package-picker-item">
                                        <input
                                            type="checkbox"
                                            checked={order() >= 0}
                                            disabled={busy()}
                                            onChange={(e) =>
                                                toggle(
                                                    workflow.id,
                                                    e.currentTarget.checked
                                                )
                                            }
                                        />
                                        <span>{workflow.name}</span>
                                        <Show when={order() === 0}>
                                            <span class="package-badge">
                                                {t('editor.main', 'main')}
                                            </span>
                                        </Show>
                                        <span class="muted package-picker-version">
                                            v{workflow.version}
                                        </span>
                                    </label>
                                </li>
                            );
                        }}
                    </For>
                </ul>
                <Show when={missing().length > 0}>
                    <ul class="package-missing" role="alert">
                        <For each={missing()}>
                            {(m) => (
                                <li>
                                    {m.by === null
                                        ? t(
                                              'publish.missing_error',
                                              '“{needs}” handles the package’s errors: choose it too.'
                                          ).replace('{needs}', m.needs)
                                        : t(
                                              'publish.missing',
                                              '“{by}” calls “{needs}”: choose it too.'
                                          )
                                              .replace('{by}', m.by)
                                              .replace('{needs}', m.needs)}
                                </li>
                            )}
                        </For>
                    </ul>
                </Show>
                <p class="muted package-hint">
                    {t(
                        'publish.hint',
                        'Webhook secrets are left out; anything else in the blocks (an API key in a header) is published as it is.'
                    )}
                </p>
                <FieldError
                    for={inputId('workflows')}
                    errors={errors().workflows}
                />
            </fieldset>
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
                <Button
                    type="submit"
                    busy={busy()}
                    disabled={
                        programs.loading ||
                        missing().length > 0 ||
                        chosen().length === 0
                    }
                >
                    {t('publish.submit', 'Publish')}
                </Button>
            </div>
        </form>
    );
}
