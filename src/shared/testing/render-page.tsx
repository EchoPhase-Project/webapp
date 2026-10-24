import type { JSX } from 'solid-js';
import { render } from '@solidjs/testing-library';
import { RootMetaContext } from '@shared/meta/page-meta';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { AuthProvider } from '@shared/api/auth-provider';

/** A page with the providers every page has, inside a router at `/`. */
export function renderPage(page: () => JSX.Element) {
    return render(
        () => (
            <RootMetaContext.Provider
                value={{ setTitle: () => {}, setDescription: () => {} }}
            >
                <I18nProvider>
                    <AuthProvider>{page()}</AuthProvider>
                </I18nProvider>
            </RootMetaContext.Provider>
        ),
        { location: '/' }
    );
}
