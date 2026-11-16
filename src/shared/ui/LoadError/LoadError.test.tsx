// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { NetworkError } from '@shared/api/client';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { expectNoA11yViolations } from '@shared/testing/axe';
import LoadError from './LoadError';

describe('LoadError', () => {
    it('announces the error and asks again', async () => {
        const onRetry = vi.fn();
        render(() => (
            <I18nProvider>
                <LoadError error={new Error('offline')} onRetry={onRetry} />
            </I18nProvider>
        ));
        expect(screen.getByRole('alert').textContent).toContain(
            NetworkError.message
        );
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(onRetry).toHaveBeenCalledOnce();
        await expectNoA11yViolations();
    });
});
