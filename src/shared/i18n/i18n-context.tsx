import {
    createContext,
    useContext,
    createSignal,
    createResource,
    createEffect,
    JSX,
} from 'solid-js';

export interface Translations {
    [key: string]: string | Translations;
}

interface I18nContextType {
    currentLocale: () => string;
    translations: () => Translations | undefined;
    setLocale: (locale: string) => void;
    t: (key: string, fallback?: string) => string;
    availableLocales: () => { code: string; nativeName: string }[] | undefined;
    isLoading: () => boolean;
    loadNamespace: (
        namespace: string,
        locale: string
    ) => Promise<Translations | undefined>;
}

const defaultLocale = 'en';
const STORAGE_KEY = 'app_locale';

// Locale files: <code>.json holds the strings used across the site and is
// loaded on start; <namespace>.<code>.json holds one page's strings and is
// loaded only when that page asks for it (useLocalizer('<namespace>')).
// Codes are "ru" or "pt-BR".
const CODE = '[a-z]{2}(?:-[A-Z]{2})?';
const globalFile = new RegExp(`/(${CODE})\\.json$`);
const namespaceFile = new RegExp(`/([^/.]+)\\.(${CODE})\\.json$`);

const files = import.meta.glob<string>('@static/locales/*.json', {
    query: '?raw',
    import: 'default',
    eager: false,
});

const globalLoaders: Record<string, () => Promise<string>> = {};
const namespaceLoaders: Record<string, () => Promise<string>> = {};
for (const [path, loader] of Object.entries(files)) {
    const ns = path.match(namespaceFile);
    if (ns) {
        namespaceLoaders[`${ns[1]}.${ns[2]}`] = loader;
        continue;
    }
    const code = path.match(globalFile)?.[1];
    if (code) globalLoaders[code] = loader;
}

const cache = new Map<string, Promise<Translations | undefined>>();

/** One locale file, parsed once; undefined when it does not exist. */
function loadFile(
    loaders: Record<string, () => Promise<string>>,
    key: string
): Promise<Translations | undefined> {
    const loader = loaders[key];
    if (!loader) return Promise.resolve(undefined);
    let pending = cache.get(key);
    if (!pending) {
        pending = loader()
            .then((raw) => JSON.parse(raw) as Translations)
            .catch((e) => {
                console.error(`Error loading translations "${key}":`, e);
                cache.delete(key);
                return undefined;
            });
        cache.set(key, pending);
    }
    return pending;
}

/**
 * A language's name in itself ("Русский", "Română"), from the browser's own
 * data: a translation added in Weblate shows in the language list as is.
 */
export function nativeName(code: string): string {
    try {
        const name = new Intl.DisplayNames([code], { type: 'language' }).of(
            code
        );
        if (name && name !== code)
            return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
    } catch {
        // Unknown code or no Intl.DisplayNames: show the code itself.
    }
    return code;
}

/**
 * The string at a dotted key, or undefined when it is missing or empty: an
 * untranslated string falls back instead of showing nothing.
 */
export function lookup(
    translations: Translations | undefined,
    key: string
): string | undefined {
    let current: string | Translations | undefined = translations;
    for (const part of key.split('.')) {
        if (current == null || typeof current !== 'object') return undefined;
        current = current[part];
    }
    return typeof current === 'string' && current !== '' ? current : undefined;
}

const I18nContext = createContext<I18nContextType>();

export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n must be used within I18nProvider');
    return ctx;
}

/**
 * Translator for one page. With a namespace, keys are looked up in
 * <namespace>.<locale>.json, then <namespace>.en.json, then the site-wide
 * strings; without one it is the site-wide `t`.
 */
export function useLocalizer(namespace?: string) {
    const { currentLocale, t, loadNamespace } = useI18n();
    if (!namespace) return t;

    const [current] = createResource(currentLocale, (locale) =>
        loadNamespace(namespace, locale)
    );
    const [fallback] = createResource(() =>
        loadNamespace(namespace, defaultLocale)
    );

    return (key: string, fallbackText?: string): string =>
        lookup(current(), key) ??
        lookup(fallback(), key) ??
        t(key, fallbackText);
}

export function I18nProvider(props: { children: JSX.Element }) {
    const locales = Object.keys(globalLoaders)
        .sort()
        .map((code) => ({ code, nativeName: nativeName(code) }));
    const availableLocales = () => locales;

    function getBrowserLocale(): string | null {
        if (typeof navigator === 'undefined') return null;
        return navigator.language?.slice(0, 2).toLowerCase() ?? null;
    }

    function getInitialLocale(): string {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && globalLoaders[stored]) return stored;
        } catch {
            // Storage blocked: fall through to the browser's language.
        }
        const browserLocale = getBrowserLocale();
        if (browserLocale && globalLoaders[browserLocale]) return browserLocale;
        return defaultLocale;
    }

    const [currentLocale, setCurrentLocale] =
        createSignal<string>(getInitialLocale());

    const [translations] = createResource(currentLocale, (locale) =>
        loadFile(globalLoaders, locale)
    );
    // Strings missing from a translation show in English, not as keys.
    const [defaults] = createResource(() =>
        loadFile(globalLoaders, defaultLocale)
    );

    createEffect(() => {
        if (typeof document !== 'undefined')
            document.documentElement.lang = currentLocale();
    });

    function loadNamespace(
        namespace: string,
        locale: string
    ): Promise<Translations | undefined> {
        return loadFile(namespaceLoaders, `${namespace}.${locale}`);
    }

    function setLocale(locale: string): void {
        if (!globalLoaders[locale]) {
            console.warn(
                `Locale "${locale}" not supported, fallback to '${defaultLocale}'`
            );
            locale = defaultLocale;
        }
        if (locale === currentLocale()) return;
        setCurrentLocale(locale);
        try {
            localStorage.setItem(STORAGE_KEY, locale);
        } catch {
            // Not remembered across visits; the choice still applies now.
        }
    }

    function t(key: string, fallback?: string): string {
        return (
            lookup(translations(), key) ??
            lookup(defaults(), key) ??
            fallback ??
            key
        );
    }

    return (
        <I18nContext.Provider
            value={{
                currentLocale,
                translations,
                setLocale,
                t,
                availableLocales,
                isLoading: () => translations.loading || defaults.loading,
                loadNamespace,
            }}
        >
            {props.children}
        </I18nContext.Provider>
    );
}
