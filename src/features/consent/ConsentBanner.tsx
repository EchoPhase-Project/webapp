import { Show } from 'solid-js';
import { A } from '@solidjs/router';
import { useI18n } from '@shared/i18n/i18n-context';
import {
    consent,
    FullConsent,
    NoConsent,
    setConsent,
    setSettingsOpen,
    settingsOpen,
} from '@shared/lib/consent';
import Button from '@shared/ui/Button';
import './consent.scss';

/**
 * Asks once, before anything optional runs: statistics and error reports
 * start only after "Accept all" or a choice in the settings. Rejecting is
 * as easy as accepting (same button, same place); closing the page without
 * choosing allows nothing.
 */
export default function ConsentBanner() {
    const i18n = useI18n();
    const t = (key: string, fallback: string) =>
        i18n.t(`consent.${key}`, fallback);

    return (
        <Show when={consent() === null && !settingsOpen()}>
            <section
                class="consent-banner card"
                role="region"
                aria-labelledby="consent-banner-title"
            >
                <h2 id="consent-banner-title">
                    {t('banner.title', 'Cookies and statistics')}
                </h2>
                <p>
                    {t(
                        'banner.text',
                        'EchoPhase uses the cookies it needs to keep you signed in. With your permission it also counts page visits and receives error reports, both without personal data, to see what to improve.'
                    )}{' '}
                    <A href="/privacy">
                        {t('banner.policy', 'Privacy Policy')}
                    </A>
                </p>
                <div class="consent-actions">
                    <Button
                        variant="ghost"
                        onClick={() => setSettingsOpen(true)}
                    >
                        {t('customize', 'Customize')}
                    </Button>
                    <Button onClick={() => setConsent(NoConsent)}>
                        {t('reject_all', 'Reject all')}
                    </Button>
                    <Button onClick={() => setConsent(FullConsent)}>
                        {t('accept_all', 'Accept all')}
                    </Button>
                </div>
            </section>
        </Show>
    );
}
