import { createSignal } from 'solid-js';

/**
 * What the visitor allowed beyond what the site needs to work. Sign-in
 * cookies and the remembered theme and language are necessary and always on;
 * these two are optional and off until the visitor says yes.
 */
export type Consent = {
    /** Visit statistics (Umami): pages viewed, no cookies, no profile. */
    analytics: boolean;
    /** Error reports (GlitchTip): what broke in the page, no personal data. */
    errors: boolean;
};

export type ConsentCategory = keyof Consent;

export const ConsentCategories: readonly ConsentCategory[] = [
    'analytics',
    'errors',
];

type StoredConsent = Consent & { version: number; decidedAt: string };

const STORAGE_KEY = 'consent';
// Raised when the categories or what they cover change: everyone is asked
// again instead of a "yes" carrying over to something it was not given for.
export const ConsentVersion = 1;

export const NoConsent: Consent = { analytics: false, errors: false };
export const FullConsent: Consent = { analytics: true, errors: true };

function read(): Consent | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const stored = JSON.parse(raw) as Partial<StoredConsent>;
        if (stored.version !== ConsentVersion) return null;
        return {
            analytics: stored.analytics === true,
            errors: stored.errors === true,
        };
    } catch {
        // Unreadable or storage blocked: ask again.
        return null;
    }
}

// null: not decided yet (the banner shows).
const [consent, setConsentSignal] = createSignal<Consent | null>(read());

/** The visitor's choice, or null before they made one. */
export { consent };

/** What is allowed now: nothing optional until the visitor decides. */
export const granted = (): Consent => consent() ?? NoConsent;

/** Records a choice (from the banner or the settings) and applies it. */
export function setConsent(choice: Consent): void {
    const stored: StoredConsent = {
        ...choice,
        version: ConsentVersion,
        decidedAt: new Date().toISOString(),
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
        // Not remembered across visits; the choice still applies now.
    }
    setConsentSignal({ analytics: choice.analytics, errors: choice.errors });
}

/** Forgets the choice, so the banner asks again (tests, a policy change). */
export function resetConsent(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nothing stored to forget.
    }
    setConsentSignal(null);
}

/** The cookie settings dialog: opened from the banner or the footer. */
const [settingsOpen, setSettingsOpen] = createSignal(false);
export { settingsOpen, setSettingsOpen };
