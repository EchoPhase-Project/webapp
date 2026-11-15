import { createSignal } from 'solid-js';
import { createSubmit } from '@shared/api/submit';
import type { Workflow } from '@shared/api/types';
import { updateWorkflowMutation } from '@features/packages/api/workflows';
import { removeBlock, type Program } from '@features/packages/program-edit';

/**
 * A table of a workflow's triggers (webhooks, schedules) that edits its
 * program: each change saved as a new version, the trigger being edited
 * (`E`: the trigger, or e.g. 'new' for one being added) and the one asked
 * about before it is deleted. A save is kept in the cache as the workflow
 * (updateWorkflowMutation): its page shows it.
 */
export function useProgramSave<T extends { blockId: number }, E = T>(
    workflow: () => Workflow
) {
    const [editing, setEditing] = createSignal<E | null>(null);
    const [deleting, setDeleting] = createSignal<T | null>(null);
    const { busy, errors, mutation } = createSubmit();
    const updating = mutation(updateWorkflowMutation);

    /** Saves the program over the version shown; true when it is saved. */
    function save(program: Program) {
        return updating.run({ workflow: workflow(), changes: { program } });
    }

    /**
     * Takes the trigger out of the program. The question closes only when
     * it is saved; otherwise it stays open with the errors.
     */
    async function remove(trigger: T) {
        if (await save(removeBlock(workflow().program, trigger.blockId)))
            setDeleting(null);
    }

    return {
        busy,
        errors,
        save,
        remove,
        editing,
        setEditing,
        deleting,
        setDeleting,
    };
}
