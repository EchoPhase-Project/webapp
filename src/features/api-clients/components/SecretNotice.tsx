import { createSignal } from 'solid-js';
import { useLocalizer } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import Card from '@shared/ui/Card';

/** A new client's secret, shown this once, with a copy button. */
export default function SecretNotice(props: {
    secret: string;
    onDismiss: () => void;
}) {
    const t = useLocalizer('api-clients');
    const [copied, setCopied] = createSignal(false);
    let code: HTMLElement | undefined;

    async function copy() {
        try {
            await navigator.clipboard.writeText(props.secret);
            setCopied(true);
        } catch {
            // No clipboard (insecure context, refused): select it to copy by hand.
            const range = document.createRange();
            if (code) range.selectNodeContents(code);
            getSelection()?.removeAllRanges();
            getSelection()?.addRange(range);
        }
    }

    return (
        <Card class="secret-notice" role="status">
            <p>{t('secret', 'Secret (shown once, copy it now):')}</p>
            <code ref={code}>{props.secret}</code>
            <div class="secret-actions">
                <Button onClick={() => void copy()}>
                    {copied() ? t('copied', 'Copied') : t('copy', 'Copy')}
                </Button>
                <Button variant="ghost" onClick={() => props.onDismiss()}>
                    {t('dismiss', 'Done')}
                </Button>
            </div>
        </Card>
    );
}
