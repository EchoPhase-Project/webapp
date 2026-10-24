import { useI18n } from '@shared/i18n/i18n-context';
import { outage, retryNow } from '@shared/api/outage-watch';
import Button from '@shared/ui/Button';
import Modal from '@shared/ui/Modal';
import './maintenance.scss';

/**
 * Covers the app while the service is under maintenance or not answering,
 * instead of letting each page fail on its own (a failed session check
 * would otherwise look like being signed out). A dialog that cannot be
 * dismissed: the page behind is inert. It goes away by itself: the page
 * reloads once the service is back.
 */
export default function MaintenanceScreen() {
    const i18n = useI18n();
    const maintenance = () => outage()?.kind === 'maintenance';

    return (
        <Modal
            open={!!outage()}
            dismissible={false}
            role="alertdialog"
            class="outage patterned"
            title={
                maintenance()
                    ? i18n.t('outage.maintenance.title', 'Under maintenance')
                    : i18n.t(
                          'outage.unavailable.title',
                          "Can't reach EchoPhase"
                      )
            }
        >
            <p>
                {maintenance()
                    ? (outage()?.message ??
                      i18n.t(
                          'outage.maintenance.text',
                          'EchoPhase is being updated. We will be back shortly.'
                      ))
                    : i18n.t(
                          'outage.unavailable.text',
                          'The service is not responding right now.'
                      )}
            </p>
            <p class="muted">
                {i18n.t(
                    'outage.auto',
                    'This page comes back by itself when the service does.'
                )}
            </p>
            <Button autofocus onClick={retryNow}>
                {i18n.t('outage.retry', 'Try now')}
            </Button>
        </Modal>
    );
}
