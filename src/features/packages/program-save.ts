import { createSignal } from 'solid-js';
import type { Workflow } from '@shared/api/types';
import { createConfirm } from '@shared/ui/ConfirmDialog';
import { updateWorkflowMutation } from '@features/packages/api/workflows';
import { removeBlock } from '@features/packages/program-edit';

/**
 * A table of a workflow's triggers (webhooks, schedules) that edits its
 * program: each change saved as a new version, the trigger being edited
 * (`E`: the trigger, or e.g. 'new' for one being added) and its delete,
 * asked about first (`deletion`, for a ConfirmDialog). A save is kept in
 * the cache as the workflow (updateWorkflowMutation): its page shows it.
 * An edit form saves on its own (createForm, the same description), so its
 * errors show in its dialog; a failed delete shows in the question.
 */
export function useProgramSave<T extends { blockId: number }, E = T>(
    workflow: () => Workflow
) {
    const [editing, setEditing] = createSignal<E | null>(null);
    const deletion = createConfirm(updateWorkflowMutation, (trigger: T) => ({
        workflow: workflow(),
        changes: { program: removeBlock(workflow().program, trigger.blockId) },
    }));
    return { editing, setEditing, deletion };
}
