import { useI18n } from '@shared/i18n/i18n-context';
import { LinkButton } from '@shared/ui/Button';
import Card from '@shared/ui/Card';
import '@shared/ui/EmptyState/empty-state.scss';

const NotFound = () => {
    const { t } = useI18n();
    return (
        <Card patterned class="empty-state not-found">
            <h1>{t('not_found.title', 'Page not found')}</h1>
            <p class="muted">
                {t(
                    'not_found.text',
                    'There is nothing at this address. It may have moved, or the link may be mistyped.'
                )}
            </p>
            <LinkButton href="/">
                {t('not_found.home', 'Go to the home page')}
            </LinkButton>
        </Card>
    );
};

export default NotFound;
