import { Show, type JSX } from 'solid-js';
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
 */
export default function AuthShell(props: {
    title: string;
    description: string;
    children: JSX.Element;
}) {
    const auth = useAuth();
    const [search] = useSearchParams<AuthSearch>();
    return (
        <Show
            when={!auth.isAuthenticated()}
            fallback={<Navigate href={safeNext(search.next)} />}
        >
            <div class="page-stack auth-page">
                <PageHeader
                    title={props.title}
                    description={props.description}
                />
                <Card class="auth-card" patterned>
                    {props.children}
                </Card>
            </div>
        </Show>
    );
}
