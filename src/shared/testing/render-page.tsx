import type { JSX } from 'solid-js';
import { render } from '@solidjs/testing-library';
import {
    MemoryRouter,
    Route,
    createMemoryHistory,
    type MemoryHistory,
} from '@solidjs/router';
import { RootMetaContext } from '@shared/meta/page-meta';
import { I18nProvider } from '@shared/i18n/i18n-context';
import {
    SessionProvider,
    resetSession,
    sessionStart,
} from '@shared/api/session-provider';

/**
 * A fresh session for one test: a new QueryClient that does not retry (an
 * error shows at once) and collects nothing on a timer, and a pair of
 * tabs instead of BroadcastChannel. No cache goes from one test to another.
 */
export const freshSession = () =>
    resetSession({
        queries: { retry: false, gcTime: Infinity },
        mutations: { gcTime: Infinity },
    });

/**
 * A memory router made anew with each session, as the app's: it starts
 * where the session does (after signing in, at `next`), or where `history`
 * is now.
 */
export function SessionMemoryRouter(props: {
    history: MemoryHistory;
    children: JSX.Element;
}) {
    const start = sessionStart();
    // eslint-disable-next-line solid/reactivity
    if (start) props.history.set({ value: start, replace: true });
    return (
        <MemoryRouter history={props.history}>{props.children}</MemoryRouter>
    );
}

/**
 * Routes with the providers every page has, in a memory router that starts
 * at `path`. The session is reset first (freshSession); `history` and
 * `otherTab` come back with the render.
 */
export function renderRoutes(routes: () => JSX.Element, path = '/') {
    const { otherTab } = freshSession();
    const history = createMemoryHistory();
    history.set({ value: path });
    const rendered = render(() => (
        <RootMetaContext.Provider
            value={{ setTitle: () => {}, setDescription: () => {} }}
        >
            <I18nProvider>
                <SessionProvider>
                    <SessionMemoryRouter history={history}>
                        {routes()}
                    </SessionMemoryRouter>
                </SessionProvider>
            </I18nProvider>
        </RootMetaContext.Provider>
    ));
    return { ...rendered, history, otherTab };
}

/**
 * A page with the providers every page has, as the route of `path` in a
 * memory router (so useNavigate and useSearchParams work); with `pattern`
 * (e.g. "/packages/:id"), useParams reads it too. See renderRoutes.
 */
export function renderPage(page: () => JSX.Element, path = '/', pattern = '*') {
    return renderRoutes(
        () => <Route path={pattern} component={() => page()} />,
        path
    );
}
