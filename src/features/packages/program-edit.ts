import type { Workflow } from '@shared/api/types';

// Changes to a workflow's program made outside the block editor: its
// triggers (webhooks, schedules) as rows of a table. Pure: a new program.

export type Program = Workflow['program'];
type Block = Program['blocks'][number];

const STARTS = new Set(['ManualTrigger', 'WebhookTrigger', 'ScheduleTrigger']);

/**
 * Where the workflow starts: the blocks its triggers lead to; without
 * any, the blocks nothing leads to (its roots).
 */
export function startTargets(program: Program): number[] {
    const triggers = new Set(
        program.blocks.filter((b) => STARTS.has(b.type)).map((b) => b.id)
    );
    const fromTriggers = program.connections
        .filter((c) => triggers.has(c.from))
        .map((c) => c.to);
    if (fromTriggers.length > 0) return [...new Set(fromTriggers)];
    const led = new Set(program.connections.map((c) => c.to));
    return program.blocks
        .filter((b) => !b.type.endsWith('Trigger') && !led.has(b.id))
        .map((b) => b.id);
}

/** A new trigger, leading where the others do. */
export function addTrigger(
    program: Program,
    type: 'WebhookTrigger' | 'ScheduleTrigger',
    params: Record<string, unknown>
): Program {
    const id = Math.max(0, ...program.blocks.map((b) => b.id)) + 1;
    const block: Block = {
        id,
        type,
        version: 1,
        params,
        disabled: false,
        onError: 0,
    };
    return {
        ...program,
        blocks: [...program.blocks, block],
        connections: [
            ...program.connections,
            ...startTargets(program).map((to) => ({
                from: id,
                to,
                output: 'main',
            })),
        ],
    };
}

/** A block's params, with these changed. */
export function setParams(
    program: Program,
    blockId: number,
    changes: Record<string, unknown>
): Program {
    return {
        ...program,
        blocks: program.blocks.map((b) =>
            b.id === blockId
                ? {
                      ...b,
                      params: {
                          ...((b.params ?? {}) as Record<string, unknown>),
                          ...changes,
                      },
                  }
                : b
        ),
    };
}

/** Without the block and what leads to it or from it. */
export function removeBlock(program: Program, blockId: number): Program {
    return {
        ...program,
        blocks: program.blocks.filter((b) => b.id !== blockId),
        connections: program.connections.filter(
            (c) => c.from !== blockId && c.to !== blockId
        ),
        startIds: (program.startIds ?? []).filter((id) => id !== blockId),
    };
}

/** The zone its schedules are read in; empty: the owner's. */
export function setTimeZone(program: Program, zone: string): Program {
    return {
        ...program,
        settings: { ...program.settings, timeZone: zone.trim() || null },
    };
}

/** A block's params as an object. */
export const paramsOf = (program: Program, blockId: number) =>
    (program.blocks.find((b) => b.id === blockId)?.params ?? {}) as Record<
        string,
        unknown
    >;

/** A new webhook secret: 32 random bytes, base64url (the server wants at least 16 characters). */
export function newSecret(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
