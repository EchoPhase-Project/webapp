import { describe, expect, it } from 'vitest';
import type { AppNotification } from '@shared/api/types';
import { fill, type Translate } from '@shared/i18n/i18n-context';
import { wordingOf } from './wording';

// The English fallbacks with their values, as the app shows them with no
// translation loaded.
const t: Translate = (_key, fallback, values) => fill(fallback ?? '', values);

const notification = (
    kind: string,
    params: Record<string, string> = {},
    over: Partial<AppNotification> = {}
): AppNotification => ({
    id: 'n1',
    kind,
    title: 'Server title',
    body: 'Server body',
    params,
    read: false,
    createdAt: '2026-11-24T10:00:00Z',
    ...over,
});

describe('wordingOf', () => {
    it.each([
        [
            'a sign-in from a browser',
            notification('sign_in', {
                device: 'Mozilla/5.0 (X11; Linux x86_64) Firefox/133.0',
            }),
            'New sign-in to your account',
            'Firefox on Linux',
        ],
        [
            'a sign-in from a device the parser cannot read',
            notification('sign_in', { device: 'curl/8.0' }),
            'New sign-in to your account',
            'curl/8.0',
        ],
        [
            'the storage nearly full',
            notification('storage_quota', { percent: '92' }),
            'Your files take 92% of your storage',
            'Delete files you no longer need to keep uploading.',
        ],
        [
            'a note shared to edit',
            notification('note_shared', {
                by: 'Ann',
                access: 'edit',
                note: 'Plan',
            }),
            'Ann shared a note with you to edit',
            'Plan',
        ],
        [
            'a note shared to read, without its title',
            notification('note_shared', { by: 'Ann', access: 'read' }),
            'Ann shared a note with you',
            'Server body',
        ],
        [
            'a reminder',
            notification('note_reminder', { note: 'Plan' }),
            'Reminder: Plan',
            '',
        ],
        [
            'a kind it does not know (a workflow’s own)',
            notification('workflow', {}, { title: 'Done', body: 'All good' }),
            'Done',
            'All good',
        ],
    ])('words %s', (_case, n, title, body) => {
        expect(wordingOf(n, t)).toEqual({ title, body });
    });
});
