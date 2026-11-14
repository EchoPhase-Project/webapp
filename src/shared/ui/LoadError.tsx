import { ApiError, NetworkError } from '@shared/api/client';
import { FORM } from '@shared/api/errors';
import { useI18n } from '@shared/i18n/i18n-context';
import Button from '@shared/ui/Button';
import ErrorSummary from '@shared/ui/ErrorSummary';

/**
 * What a failed read (a query's error) shows instead of its data: the API's
 * error items, or a network error for anything else, and a way to ask again.
 */
export default function LoadError(props: {
    error: Error;
    /** Asks again (the query's refetch). */
    onRetry: () => unknown;
    /** While asking again. */
    busy?: boolean;
}) {
    const i18n = useI18n();
    const errors = () => ({
        [FORM]:
            props.error instanceof ApiError
                ? props.error.errors
                : [NetworkError],
    });
    return (
        <div class="page-stack">
            <ErrorSummary errors={errors()} />
            <div class="actions-row">
                <Button busy={props.busy} onClick={() => void props.onRetry()}>
                    {i18n.t('ui.try_again', 'Try again')}
                </Button>
            </div>
        </div>
    );
}
