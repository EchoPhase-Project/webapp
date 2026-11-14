import { createSignal, For, Show } from 'solid-js';
import { useQueries } from '@tanstack/solid-query';
import { createSubmit } from '@shared/api/submit';
import type {
    PackageVersion,
    Workflow,
    WorkflowPackage,
    WorkflowSummary,
} from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import Checkbox from '@shared/ui/Checkbox';
import ErrorSummary from '@shared/ui/ErrorSummary';
import FieldError, { errorId } from '@shared/ui/FieldError';
import LoadError from '@shared/ui/LoadError';
import Modal from '@shared/ui/Modal';
import TextArea from '@shared/ui/TextArea';
import { publishVersion } from '@features/packages/api/packages';
import { workflowQuery } from '@features/packages/api/workflows';

const FIELDS = ['workflows', 'changelog'] as const;
const inputId = (field: string) => `package-publish-${field}`;

/** The keys of the workflows a program calls (ExecuteWorkflow). */
function callsOf(workflow: Workflow): string[] {
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

function missingOf(
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
    const { busy, errors, run } = createSubmit(FIELDS);
    const [unchanged, setUnchanged] = createSignal(false);

    // Their programs: what each calls. One read each, shared with their
    // pages; until all are in, nothing is published.
    const programs = useQueries(() => ({
        queries: props.workflows.map((w) => workflowQuery(w.id)),
    }));
    const loaded = () => programs.flatMap((r) => (r.data ? [r.data] : []));
    const failed = () => programs.filter((r) => r.isError);
    const missing = () =>
        missingOf(chosen(), loaded(), props.pkg.errorWorkflow);

    const toggle = (id: string, on: boolean) =>
        setChosen((list) =>
            on ? [...list, id] : list.filter((c) => c !== id)
        );

    async function publish(e: Event) {
        e.preventDefault();
        if (busy() || missing().length > 0 || chosen().length === 0) return;
        await run(
            () =>
                publishVersion(props.pkg.id, {
                    workflows: chosen(),
                    changelog: changelog(),
                }),
            (version) => {
                setUnchanged(false);
                props.onPublished(version);
            },
            // A conflict: nothing changed since the latest version. It has
            // its own notice instead of an error.
            (items) => {
                const conflict = items.some((e) => e.code === 'Conflict');
                setUnchanged(conflict);
                return conflict ? {} : undefined;
            }
        );
    }

    return (
        <form class="vert-form" onSubmit={(e) => void publish(e)} noValidate>
            <ErrorSummary errors={errors()} inputId={inputId} />
            <Show when={failed()[0]?.error}>
                {(error) => (
                    <LoadError
                        error={error()}
                        busy={failed().some((r) => r.isFetching)}
                        onRetry={() =>
                            Promise.all(failed().map((r) => r.refetch()))
                        }
                    />
                )}
            </Show>
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
                                    <Checkbox
                                        checked={order() >= 0}
                                        disabled={busy()}
                                        onChange={(on) =>
                                            toggle(workflow.id, on)
                                        }
                                        label={
                                            <>
                                                {workflow.name}
                                                <Show when={order() === 0}>
                                                    <span class="badge">
                                                        {t(
                                                            'editor.main',
                                                            'main'
                                                        )}
                                                    </span>
                                                </Show>
                                            </>
                                        }
                                        description={`v${workflow.version}`}
                                    />
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
                                              '“{needs}” handles the package’s errors: choose it too.',
                                              { needs: m.needs }
                                          )
                                        : t(
                                              'publish.missing',
                                              '“{by}” calls “{needs}”: choose it too.',
                                              { by: m.by, needs: m.needs }
                                          )}
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
            <TextArea
                id={inputId('changelog')}
                name="changelog"
                label={t(
                    'publish.changelog',
                    'What changed (Markdown, optional)'
                )}
                showLabel
                errors={errors().changelog}
                rows={4}
                maxLength={10000}
                disabled={busy()}
                value={changelog()}
                onInput={(e) => setChangelog(e.currentTarget.value)}
            />
            <div class="actions-row actions-row--end">
                <Button
                    type="submit"
                    busy={busy()}
                    disabled={
                        programs.some((r) => !r.isSuccess) ||
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
