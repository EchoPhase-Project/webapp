import { Match, Show, Switch, type Component, type JSX } from 'solid-js';
import { Navigate, useLocation, type RouteSectionProps } from '@solidjs/router';
import { useAuth } from './auth-provider';

export const SignInPath = '/auth';

/**
 * Where to go after signing in: `next` when it is a path of this site,
 * otherwise home. Never another origin (//evil.example), never /auth itself.
 */
export function safeNext(next: string | null | undefined): string {
    if (
        !next ||
        !next.startsWith('/') ||
        next.startsWith('//') ||
        next.startsWith('/\\')
    )
        return '/';
    const path = next.split(/[?#]/)[0];
    return path === SignInPath ? '/' : next;
}

/** /auth with the way back to where the user is now. */
export function signInHref(here: {
    pathname: string;
    search: string;
    hash: string;
}) {
    const next = here.pathname + here.search + here.hash;
    return next === '/'
        ? SignInPath
        : `${SignInPath}?next=${encodeURIComponent(next)}`;
}

/**
 * A page for signed-in users only: nothing while the user is loading, a
 * redirect to sign in (and back) when signed out. Also when the session
 * ends while the page is open: the API client signs the user out on a 401.
 */
export function requireAuth<P extends RouteSectionProps>(
    page: Component<P>
): Component<P> {
    return (props) => {
        const auth = useAuth();
        const location = useLocation();
        return (
            <Switch>
                <Match when={auth.user() === null}>
                    <Navigate href={signInHref(location)} />
                </Match>
                <Match when={auth.user()}>{page(props)}</Match>
            </Switch>
        );
    };
}

/** Parts of a page shown only to a signed-in user (nothing while loading). */
export function SignedIn(props: {
    children: JSX.Element;
    fallback?: JSX.Element;
}) {
    const auth = useAuth();
    return (
        <Show when={auth.isAuthenticated()} fallback={props.fallback}>
            {props.children}
        </Show>
    );
}

/** Parts of a page shown only when nobody is signed in (nothing while loading). */
export function SignedOut(props: { children: JSX.Element }) {
    const auth = useAuth();
    return <Show when={auth.user() === null}>{props.children}</Show>;
}
