import { Match, Switch, type JSX } from 'solid-js';
import { Navigate, useSearchParams } from '@solidjs/router';
import { useAuth } from '@shared/api/auth';
import { safeNext } from '@shared/api/auth-guards';
import Card from '@shared/ui/Card';
import PageHeader from '@shared/ui/PageHeader';

export type AuthSearch = { next?: string; mode?: string };

/** A sign-in page's address, with ?next= kept. */
export function authHref(path: string, next: string | undefined) {
    return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}

/**
 * The frame of the two sign-in pages: their header, the form on a card
 * (the brand pattern behind it), and away to ?next= once the user is known.
 * Nothing while the session is still being asked for: a signed-in user who
 * opens the page sees no form before the redirect. If the check of the
 * session failed, the form shows: signing in is the way out.
 */
export default function AuthShell(props: {
    title: string;
    description: string;
    children: JSX.Element;
}) {
    const auth = useAuth();
    const [search] = useSearchParams<AuthSearch>();
    return (
        <Switch>
            <Match when={auth.user()}>
                <Navigate href={safeNext(search.next)} />
            </Match>
            <Match when={auth.user() === null || auth.authError()}>
                <div class="page-stack auth-page">
                    <PageHeader
                        title={props.title}
                        description={props.description}
                    />
                    <Card class="auth-card" patterned>
                        {props.children}
                    </Card>
                </div>
            </Match>
        </Switch>
    );
}
