import { createSignal, For } from 'solid-js';
import { IconX } from '@shared/ui/icons';
import { useRealtimeEvent } from './realtime-provider';
import { type RealtimeEvent } from './types';
import { useI18n } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import Card from '@shared/ui/Card';
import './notices.scss';

interface Notice {
    id: number;
    title: string;
    text: string;
}

const MaxNotices = 5;

/**
 * Things the server tells the user while they are on the site: a connection
 * whose token was rejected, a Discord gateway that stopped. Dismissable;
 * the newest few are kept.
 */
export default function RealtimeNotices() {
    const i18n = useI18n();
    const [notices, setNotices] = createSignal<Notice[]>([]);
    let nextId = 0;

    const add = (title: string, text: string) =>
        setNotices((list) =>
            [...list, { id: nextId++, title, text }].slice(-MaxNotices)
        );
    const dismiss = (id: number) =>
        setNotices((list) => list.filter((n) => n.id !== id));

    useRealtimeEvent('connection.reauth_required', (event: RealtimeEvent) => {
        const connection = event.connection as
            { name?: string; provider?: string } | undefined;
        add(
            i18n.t('notice.reauth.title', 'Connection needs attention'),
            i18n.t('notice.reauth.body', 'Reconnect {provider} "{name}".', {
                provider: connection?.provider ?? '',
                name: connection?.name ?? '',
            })
        );
    });

    useRealtimeEvent('discord_gateway.failed', (event: RealtimeEvent) => {
        const gateway = event.gateway as
            { connection?: string; message?: string } | undefined;
        add(
            i18n.t(
                'notice.discord.heading',
                'Discord gateway stopped ({connection})',
                { connection: gateway?.connection ?? '' }
            ),
            gateway?.message ?? ''
        );
    });

    return (
        // Always there, empty when there is nothing: a live region that
        // comes with its first message is not announced.
        <div class="notices" role="status" aria-live="polite">
            <For each={notices()}>
                {(notice) => (
                    <Card class="notice">
                        <div class="notice-body">
                            <strong>{notice.title}</strong>
                            <p>{notice.text}</p>
                        </div>
                        <Button
                            variant="icon"
                            aria-label={i18n.t('notice.dismiss', 'Dismiss')}
                            onClick={() => dismiss(notice.id)}
                        >
                            <IconX />
                        </Button>
                    </Card>
                )}
            </For>
        </div>
    );
}
