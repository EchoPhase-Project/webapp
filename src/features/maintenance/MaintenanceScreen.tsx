import { Show } from 'solid-js';
import { useI18n } from '@shared/i18n/i18n-context';
import { outage, retryNow } from '@shared/api/outage-watch';
import './maintenance.scss';

/**
 * Covers the app while the service is under maintenance or not answering,
 * instead of letting each page fail on its own (a failed session check
 * would otherwise look like being signed out). It goes away by itself:
 * the page reloads once the service is back.
 */
export default function MaintenanceScreen() {
    const i18n = useI18n();

    return (
        <Show when={outage()}>
            {(current) => (
                <div
                    class="outage"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="outage-title"
                >
                    <div class="outage-card">
                        <Show
                            when={current().kind === 'maintenance'}
                            fallback={
                                <>
                                    <h2 id="outage-title">
                                        {i18n.t(
                                            'outage.unavailable.title',
                                            "Can't reach EchoPhase"
                                        )}
                                    </h2>
                                    <p>
                                        {i18n.t(
                                            'outage.unavailable.text',
                                            'The service is not responding right now.'
                                        )}
                                    </p>
                                </>
                            }
                        >
                            <h2 id="outage-title">
                                {i18n.t(
                                    'outage.maintenance.title',
                                    'Under maintenance'
                                )}
                            </h2>
                            <p>
                                {current().message ??
                                    i18n.t(
                                        'outage.maintenance.text',
                                        'EchoPhase is being updated. We will be back shortly.'
                                    )}
                            </p>
                        </Show>
                        <p class="outage-hint">
                            {i18n.t(
                                'outage.auto',
                                'This page comes back by itself when the service does.'
                            )}
                        </p>
                        <button class="btn" type="button" onClick={retryNow}>
                            {i18n.t('outage.retry', 'Try now')}
                        </button>
                    </div>
                </div>
            )}
        </Show>
    );
}
