import { createResource, For, Show } from 'solid-js';
import type { ErrorItem } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';
import FieldError, { errorId } from '@shared/ui/FieldError';
import { myWorkflows } from '@features/packages/api';

/**
 * The caller's workflows to publish, ticked in order: the first ticked is
 * the package's main one. Installed copies are left out (they are someone
 * else's work).
 */
export default function WorkflowPicker(props: {
    id: string;
    selected: string[];
    onChange: (ids: string[]) => void;
    disabled?: boolean;
    errors?: ErrorItem[];
}) {
    const t = useLocalizer('packages');
    const [workflows] = createResource(myWorkflows);
    const own = () => (workflows() ?? []).filter((w) => !w.source);

    const toggle = (id: string, on: boolean) =>
        props.onChange(
            on
                ? [...props.selected, id]
                : props.selected.filter((s) => s !== id)
        );

    return (
        <fieldset
            id={props.id}
            class="package-picker"
            aria-invalid={!!props.errors?.length}
            aria-describedby={
                props.errors?.length ? errorId(props.id) : undefined
            }
        >
            <legend class="field-label">
                {t(
                    'editor.workflows',
                    'Workflows (the first ticked opens first)'
                )}
            </legend>
            <Show
                when={own().length > 0}
                fallback={
                    <p class="muted">
                        <Show
                            when={!workflows.loading}
                            fallback={t('editor.loading', 'Loading…')}
                        >
                            {t(
                                'editor.no_workflows',
                                'You have no workflows of your own to publish.'
                            )}
                        </Show>
                    </p>
                }
            >
                <ul class="package-picker-list">
                    <For each={own()}>
                        {(workflow) => {
                            const order = () =>
                                props.selected.indexOf(workflow.id);
                            return (
                                <li>
                                    <label class="package-picker-item">
                                        <input
                                            type="checkbox"
                                            checked={order() >= 0}
                                            disabled={props.disabled}
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
            </Show>
            <p class="muted package-hint">
                {t(
                    'editor.workflows_hint',
                    'Include every workflow they call or use for errors. Webhook secrets are left out; anything else in the blocks (an API key in a header) is published as it is.'
                )}
            </p>
            <FieldError for={props.id} errors={props.errors} />
        </fieldset>
    );
}
