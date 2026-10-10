import { describe, expect, it } from 'vitest';
import { IdManager } from './id-manager';

describe('IdManager', () => {
    it('hands out increasing ids from 1', () => {
        const ids = new IdManager();
        expect([ids.create(), ids.create(), ids.create()]).toEqual([1, 2, 3]);
    });

    it('reuses a released id before making a new one', () => {
        const ids = new IdManager();
        ids.create();
        const second = ids.create();
        ids.release(second);
        expect(ids.create()).toBe(second);
        expect(ids.create()).toBe(3);
    });

    it('ignores ids it never handed out and double releases', () => {
        const ids = new IdManager();
        const first = ids.create();
        ids.release(42);
        ids.release(first);
        ids.release(first);
        expect(ids.create()).toBe(first);
        expect(ids.create()).toBe(2);
    });
});
