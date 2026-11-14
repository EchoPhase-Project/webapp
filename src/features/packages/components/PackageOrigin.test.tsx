// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { MemoryRouter, Route } from '@solidjs/router';
import { I18nProvider } from '@shared/i18n/i18n-context';
import PackageOrigin from './PackageOrigin';

function renderOrigin(pkg: Parameters<typeof PackageOrigin>[0]['pkg']) {
    render(() => (
        <I18nProvider>
            <MemoryRouter>
                <Route path="*" component={() => <PackageOrigin pkg={pkg} />} />
            </MemoryRouter>
        </I18nProvider>
    ));
}

describe('PackageOrigin', () => {
    it('links where it was installed from and where it is published', async () => {
        renderOrigin({
            id: 'p1',
            latestVersion: 3,
            source: { packageId: 'p0', version: 2 },
        });
        const installed = await screen.findByRole('link', {
            name: 'installed, v2',
        });
        expect(installed.getAttribute('href')).toBe('/explore/p0');
        expect(
            screen
                .getByRole('link', { name: 'published, v3' })
                .getAttribute('href')
        ).toBe('/explore/p1');
    });

    it('shows nothing for a package made here and not published', () => {
        renderOrigin({ id: 'p1', latestVersion: 0 });
        expect(screen.queryByRole('link')).toBeNull();
    });
});
