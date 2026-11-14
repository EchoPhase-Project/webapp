import { createSignal } from 'solid-js';
import { createSubmit } from '@shared/api/submit';
import type { Workflow } from '@shared/api/types';
import { saveWorkflow } from '@features/packages/api/workflows';
import { removeBlock, type Program } from '@features/packages/program-edit';

/**
 * A table of a workflow's triggers (webhooks, schedules) that edits its
 * program: each change saved as a new version, the trigger being edited
 * (`E`: the trigger, or e.g. 'new' for one being added) and the one asked
 * about before it is deleted.
 */
export function useProgramSave<T extends { blockId: number }, E = T>(
    workflow: () => Workflow,
    onChange: (workflow: Workflow) => void
) {
    const [editing, setEditing] = createSignal<E | null>(null);
    const [deleting, setDeleting] = createSignal<T | null>(null);
    const { busy, errors, run } = createSubmit();

    /** Saves the program; true when it is saved (onChange has it). */
    function save(program: Program) {
        return run(
            () => saveWorkflow(workflow(), { program }),
            (saved) => onChange(saved)
        );
    }

    /** Takes the trigger out of the program, then closes the question. */
    async function remove(trigger: T) {
        await save(removeBlock(workflow().program, trigger.blockId));
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
