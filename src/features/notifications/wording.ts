import type { AppNotification } from '@shared/api/types';
import { parseUserAgent } from '@shared/lib/user-agent';

type Translate = (key: string, fallback?: string) => string;

const fill = (text: string, values: Record<string, string>) =>
    text.replace(/\{(\w+)\}/g, (whole, name: string) => values[name] ?? whole);

/**
 * A notification in the user's language: known kinds are worded here from
 * their params; others (and workflows' own) show the server's text.
 */
export function wordingOf(
    n: AppNotification,
    t: Translate
): { title: string; body: string } {
    const p = n.params;
    switch (n.kind) {
        case 'sign_in': {
            const device = parseUserAgent(p.device ?? '');
            return {
                title: t('kinds.sign_in.title', 'New sign-in to your account'),
                body: device
                    ? fill(t('kinds.sign_in.device', '{browser} on {os}'), {
                          browser: device.browser ?? '?',
                          os: device.os ?? '?',
                      })
                    : (p.device ?? ''),
            };
        }
        case 'storage_quota':
            return {
                title: fill(
                    t(
                        'kinds.storage_quota.title',
                        'Your files take {percent}% of your storage'
                    ),
                    p
                ),
                body: t(
                    'kinds.storage_quota.body',
                    'Delete files you no longer need to keep uploading.'
                ),
            };
        case 'note_shared':
            return {
                title: fill(
                    p.access === 'edit'
                        ? t(
                              'kinds.note_shared.edit',
                              '{by} shared a note with you to edit'
                          )
                        : t(
                              'kinds.note_shared.read',
                              '{by} shared a note with you'
                          ),
                    p
                ),
                body: p.note ?? n.body,
            };
        case 'note_reminder':
            return {
                title: fill(
                    t('kinds.note_reminder.title', 'Reminder: {note}'),
                    p
                ),
                body: '',
            };
        default:
            return { title: n.title, body: n.body };
    }
}
