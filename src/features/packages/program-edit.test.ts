import { describe, expect, it } from 'vitest';
import {
    addTrigger,
    removeBlock,
    startTargets,
    type Program,
} from './program-edit';

const program = (over: Partial<Program> = {}): Program => ({
    blocks: [
        {
            id: 1,
            type: 'ManualTrigger',
            version: 1,
            params: {},
            disabled: false,
            onError: 0,
        },
        {
            id: 2,
            type: 'Print',
            version: 1,
            params: {},
            disabled: false,
            onError: 0,
        },
        {
            id: 3,
            type: 'Print',
            version: 1,
            params: {},
            disabled: false,
            onError: 0,
        },
    ],
    connections: [
        { from: 1, to: 2, output: 'main' },
        { from: 2, to: 3, output: 'main' },
    ],
    startIds: [],
    settings: {} as Program['settings'],
    ...over,
});

describe('program edits', () => {
    it('starts a new trigger where the others lead', () => {
        expect(startTargets(program())).toEqual([2]);
        const added = addTrigger(program(), 'ScheduleTrigger', {
            cron: '* * * * *',
        });
        expect(added.blocks.at(-1)).toMatchObject({
            id: 4,
            type: 'ScheduleTrigger',
        });
        expect(added.connections).toContainEqual({
            from: 4,
            to: 2,
            output: 'main',
        });
    });

    it('without triggers, at the roots', () => {
        const bare = program({
            blocks: program().blocks.slice(1),
            connections: [{ from: 2, to: 3, output: 'main' }],
        });
        expect(startTargets(bare)).toEqual([2]);
    });

    it('removes a block with what leads to it and from it', () => {
        const removed = removeBlock(program(), 2);
        expect(removed.blocks.map((b) => b.id)).toEqual([1, 3]);
        expect(removed.connections).toEqual([]);
    });
});
