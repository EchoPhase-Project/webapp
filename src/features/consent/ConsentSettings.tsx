import { createEffect, createSignal, For, on } from 'solid-js';
import { A } from '@solidjs/router';
import { useI18n } from '@shared/i18n/i18n-context';
import {
    ConsentCategories,
    FullConsent,
    granted,
    NoConsent,
    setConsent,
    setSettingsOpen,
    settingsOpen,
    type Consent,
} from '@shared/lib/consent';
import Button from '@shared/ui/Button';
import Modal from '@shared/ui/Modal';
import Switch from '@shared/ui/Switch';
import './consent.scss';

const TEXT: Record<keyof Consent, { label: string; description: string }> = {
    analytics: {
        label: 'Statistics',
        description:
            'Which pages are visited, from which kind of device and country, counted by our own Umami. No cookies, no profile of you, nothing shared.',
    },
    errors: {
        label: 'Error reports',
        description:
            'When something breaks in the page, what broke and where, sent to our own GlitchTip, so it gets fixed. No personal data.',
    },
};

/**
 * Cookie settings: what is always on and why, and a switch for each optional
 * kind. Opened from the banner and from the footer at any time, so a "yes"
 * can be taken back as easily as it was given.
 */
export default function ConsentSettings() {
    const i18n = useI18n();
    const t = (key: string, fallback: string) =>
        i18n.t(`consent.${key}`, fallback);

    // The switches start from the current choice each time it opens.
    const [draft, setDraft] = createSignal<Consent>(granted());
    createEffect(
        on(settingsOpen, (open) => {
            if (open) setDraft(granted());
        })
    );

    const save = (choice: Consent) => {
        setConsent(choice);
        setSettingsOpen(false);
    };

    return (
        <Modal
            open={settingsOpen()}
            title={t('settings.title', 'Cookie settings')}
            onClose={() => setSettingsOpen(false)}
            class="consent-settings"
        >
            <p class="muted">
                {t(
                    'settings.intro',
                    'Choose what EchoPhase may collect beyond what it needs to work. You can change this at any time from the page footer.'
                )}{' '}
                <A href="/privacy" onClick={() => setSettingsOpen(false)}>
                    {t('banner.policy', 'Privacy Policy')}
                </A>
            </p>

            <div class="consent-categories">
                <div class="switch-row">
                    <span class="switch-text">
                        <span class="switch-label">
                            {t('necessary.label', 'Necessary')}
                        </span>
                        <span class="switch-description">
                            {t(
                                'necessary.description',
                                'Sign-in and request protection cookies, and your theme, language and this choice, kept in your browser. The site does not work without them.'
                            )}
                        </span>
                    </span>
                    <span class="consent-always">
                        {t('always_on', 'Always on')}
                    </span>
                </div>

                <For each={ConsentCategories}>
                    {(category) => (
                        <Switch
                            label={t(`${category}.label`, TEXT[category].label)}
                            description={t(
                                `${category}.description`,
                                TEXT[category].description
                            )}
                            checked={draft()[category]}
                            onChange={(on) =>
                                setDraft((d) => ({ ...d, [category]: on }))
                            }
                        />
                    )}
                </For>
            </div>

            <div class="consent-actions">
                <Button variant="ghost" onClick={() => save(NoConsent)}>
                    {t('reject_all', 'Reject all')}
                </Button>
                <Button variant="ghost" onClick={() => save(FullConsent)}>
                    {t('accept_all', 'Accept all')}
                </Button>
                <Button onClick={() => save(draft())}>
                    {t('save', 'Save choices')}
                </Button>
            </div>
        </Modal>
    );
}
