import { describe, expect, it } from 'vitest';
import { notificationOf } from './events';

const n = {
    id: 'a1',
    kind: 'workflow',
    title: 'Build done',
    body: '',
    link: null,
    params: { percent: '92' },
    read: false,
    createdAt: '2026-10-25T10:00:00Z',
};

describe('notificationOf', () => {
    it('takes a notification of the shape the bell shows', () => {
        expect(notificationOf({ notification: n })).toEqual(n);
        const { link: _link, ...noLink } = n;
        expect(notificationOf({ notification: noLink })).toEqual(noLink);
    });

    it.each([
        ['no notification', {}],
        ['not an object', { notification: 'a1' }],
        ['a number id', { notification: { ...n, id: 1 } }],
        ['no title', { notification: { ...n, title: undefined } }],
        ['read as a string', { notification: { ...n, read: 'no' } }],
        ['a number link', { notification: { ...n, link: 3 } }],
        ['params with a number', { notification: { ...n, params: { a: 1 } } }],
        ['params as a list', { notification: { ...n, params: [] } }],
    ])('refuses %s', (_name, event) => {
        expect(notificationOf(event)).toBeUndefined();
    });
});
