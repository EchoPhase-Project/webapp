import { Show } from 'solid-js';
import { useLocalizer } from '@shared/i18n/i18n-context';
import { createClipboard } from '@shared/lib/clipboard';
import Button from '@shared/ui/Button';
import Card from '@shared/ui/Card';

/**
 * A new client's secret, shown this once, with a copy button. Rendered all
 * the time: its live region must be on the page before the message comes.
 * The region says only that a secret is there; the secret itself is plain
 * text outside it, read when the user moves to it, never read out at once.
 */
export default function SecretNotice(props: {
    secret: string | null;
    onDismiss: () => void;
}) {
    const t = useLocalizer('api-clients');
    const clipboard = createClipboard();
    let code: HTMLElement | undefined;

    const copied = () =>
        props.secret !== null && clipboard.copied() === props.secret;

    async function copy(secret: string) {
        if (await clipboard.copy(secret)) return;
        // No clipboard (insecure context, refused): select it to copy by hand.
        const range = document.createRange();
        if (code) range.selectNodeContents(code);
        getSelection()?.removeAllRanges();
        getSelection()?.addRange(range);
    }

    return (
        <>
            <span class="visually-hidden" role="status">
                {copied()
                    ? t('ui.copied', 'Copied')
                    : props.secret !== null
                      ? t(
                            'secret_created',
                            'Client created. Copy the secret now: it is shown only once.'
                        )
                      : ''}
            </span>
            <Show when={props.secret}>
                {(secret) => (
                    <Card class="secret-notice">
                        <p>
                            {t('secret', 'Secret (shown once, copy it now):')}
                        </p>
                        <code ref={code}>{secret()}</code>
                        <div class="actions-row">
                            <Button onClick={() => void copy(secret())}>
                                {copied()
                                    ? t('ui.copied', 'Copied')
                                    : t('copy', 'Copy')}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => props.onDismiss()}
                            >
                                {t('ui.done', 'Done')}
                            </Button>
                        </div>
                    </Card>
                )}
            </Show>
        </>
    );
}
