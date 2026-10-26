import type { JSX } from 'solid-js';
import { render } from '@solidjs/testing-library';
import { MemoryRouter, Route, createMemoryHistory } from '@solidjs/router';
import { RootMetaContext } from '@shared/meta/page-meta';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { AuthProvider } from '@shared/api/auth-provider';

/**
 * A page with the providers every page has, as the route of `path` in a
 * memory router (so useNavigate and useSearchParams work); with `pattern`
 * (e.g. "/packages/:id"), useParams reads it too.
 */
export function renderPage(page: () => JSX.Element, path = '/', pattern = '*') {
    const history = createMemoryHistory();
    history.set({ value: path });
    return render(() => (
        <RootMetaContext.Provider
            value={{ setTitle: () => {}, setDescription: () => {} }}
        >
            <I18nProvider>
                <AuthProvider>
                    <MemoryRouter history={history}>
                        <Route path={pattern} component={() => page()} />
                    </MemoryRouter>
                </AuthProvider>
            </I18nProvider>
        </RootMetaContext.Provider>
    ));
}
