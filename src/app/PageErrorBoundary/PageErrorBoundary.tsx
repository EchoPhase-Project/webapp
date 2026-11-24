import { createEffect, ErrorBoundary, on, Show } from 'solid-js';
import type { ParentProps } from 'solid-js';
import { useLocation } from '@solidjs/router';
import { useI18n } from '@shared/i18n/i18n-context';
import { usePageMeta } from '@shared/meta/page-meta';
import { reportError } from '@shared/consent/error-reporting';
import Button, { LinkButton } from '@shared/ui/Button';
import Card from '@shared/ui/Card';
import './page-error-boundary.scss';

// What browsers say when a lazy page's chunk is gone (a deploy renamed it):
// Chrome, Firefox, Safari.
const CHUNK_LOAD =
    /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

/** A lazy page whose chunk could not be loaded: a reload gets the new build. */
export function isChunkLoadError(error: unknown): boolean {
    return error instanceof Error && CHUNK_LOAD.test(error.message);
}

type PageErrorBoundaryProps = ParentProps<{
    /** Shows the error's message and stack: with the dev tools only. */
    details?: boolean;
}>;

/**
 * Catches a page that throws while it renders, so the header, navigation,
 * footer and dialogs stay. A failed read is not for this: a page shows it
 * with LoadError. A new address (path or query) starts clean.
 */
export default function PageErrorBoundary(props: PageErrorBoundaryProps) {
    return (
        <ErrorBoundary
            fallback={(error: unknown, reset) => (
                <PageError
                    error={error}
                    reset={reset}
                    details={props.details ?? import.meta.env.DEV_TOOLS}
                />
            )}
        >
            {props.children}
        </ErrorBoundary>
    );
}

function PageError(props: {
    error: unknown;
    reset: () => void;
    details: boolean;
}) {
    const { t } = useI18n();
    const location = useLocation();
    // Made once for each error caught: logged and reported once.
    // eslint-disable-next-line solid/reactivity
    const error = props.error;
    console.error(error);
    void reportError(error);

    const chunk = isChunkLoadError(error);
    const title = () =>
        chunk
            ? t('page_error.update_title', 'A new version is available')
            : t('page_error.title', 'Something went wrong');
    usePageMeta(() => ({ title: title(), description: '' }));

    // The hash is left out: a jump inside the page (the skip link) is not
    // a new address.
    createEffect(
        on(
            () => location.pathname + location.search,
            () => props.reset(),
            { defer: true }
        )
    );

    return (
        <div class="page-stack">
            <Card class="page-error page-stack">
                <h1>{title()}</h1>
                <p class="muted">
                    {chunk
                        ? t(
                              'page_error.update_text',
                              'This page could not load because EchoPhase was updated. Reload the page to get the new version.'
                          )
                        : t(
                              'page_error.text',
                              'This page stopped working because of an error. The rest of the app still works.'
                          )}
                </p>
                <div class="actions-row">
                    <Show
                        when={chunk}
                        fallback={
                            <Button onClick={() => props.reset()}>
                                {t('ui.try_again', 'Try again')}
                            </Button>
                        }
                    >
                        <Button onClick={() => window.location.reload()}>
                            {t('page_error.reload', 'Reload the page')}
                        </Button>
                    </Show>
                    <LinkButton variant="ghost" href="/">
                        {t('not_found.home', 'Go to the home page')}
                    </LinkButton>
                </div>
            </Card>
            <Show when={props.details}>
                <pre
                    class="page-error-details"
                    tabIndex={0}
                    role="region"
                    aria-label={t('page_error.details', 'Error details')}
                >
                    {describe(error)}
                </pre>
            </Show>
        </div>
    );
}

function describe(error: unknown): string {
    if (error instanceof Error) {
        return error.stack?.includes(error.message)
            ? error.stack
            : `${error.message}\n${error.stack ?? ''}`;
    }
    return String(error);
}
