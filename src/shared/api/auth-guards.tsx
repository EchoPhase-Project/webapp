import { Match, Show, Switch, type Component, type JSX } from 'solid-js';
import { Navigate, useLocation, type RouteSectionProps } from '@solidjs/router';
import { useIsFetching, useQueryClient } from '@tanstack/solid-query';
import LoadError from '@shared/ui/LoadError';
import { useAuth } from './auth';
import { authKeys } from './auth-keys';
import { outage } from './outage-watch';

const SignInPath = '/auth';

/**
 * Where to go after signing in: `next` when it is a path of this site,
 * otherwise home. Never another origin (//evil.example), never a sign-in
 * page (/auth, /auth/register) itself.
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
    return path === SignInPath || path.startsWith(`${SignInPath}/`)
        ? '/'
        : next;
}

/** /auth with the way back to where the user is now. */
function signInHref(here: { pathname: string; search: string; hash: string }) {
    const next = here.pathname + here.search + here.hash;
    return next === '/'
        ? SignInPath
        : `${SignInPath}?next=${encodeURIComponent(next)}`;
}

/**
 * The check of who is signed in failed with an answer (a 500), not an
 * outage: what went wrong, and a way to ask again.
 */
function CheckFailed(props: { error: Error }) {
    const queryClient = useQueryClient();
    const asking = useIsFetching(() => ({ queryKey: authKeys.me() }));
    return (
        <LoadError
            error={props.error}
            busy={asking() > 0}
            onRetry={() =>
                queryClient.refetchQueries({ queryKey: authKeys.me() })
            }
        />
    );
}

/**
 * A page for signed-in users only: a redirect to sign in (and back) when
 * signed out, also when the session ends while the page is open (a 401
 * ends it). A known user keeps the page when a later check fails. Before
 * the user is known: nothing while loading or during an outage (its screen
 * covers the page), and the error with "Try again" for any other failure
 * (a 500) — that is not "signed out" either.
 */
export function requireAuth<P extends RouteSectionProps>(
    page: Component<P>
): Component<P> {
    return (props) => {
        const auth = useAuth();
        const location = useLocation();
        return (
            <Switch>
                <Match when={auth.user()}>{page(props)}</Match>
                <Match when={auth.user() === null}>
                    <Navigate href={signInHref(location)} />
                </Match>
                <Match when={!outage() && auth.authError()}>
                    {(error) => <CheckFailed error={error()} />}
                </Match>
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
