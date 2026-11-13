// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@solidjs/testing-library';
import { useAuth } from '@shared/api/auth-provider';
import { fakeApi, json, user } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import { useDateFormat } from './date-format';
import { DateHelper } from './date-helper';

const at = '2026-01-02T23:30:00Z';

function Probe() {
    const date = useDateFormat();
    const { user } = useAuth();
    return (
        <p data-testid="out" data-zone={user()?.timeZone}>
            {date(at)}|{date(null)}
        </p>
    );
}

describe('useDateFormat', () => {
    it("shows a time in the user's zone, and nothing for null", async () => {
        fakeApi({
            'GET /api/v1/auth/me': () =>
                json(200, user({ timeZone: 'Asia/Tokyo' })),
            'GET /api/v1/roles/me': () => json(200, []),
        });
        renderPage(() => <Probe />);
        const out = await screen.findByTestId('out');
        await expect
            .poll(() => out.getAttribute('data-zone'))
            .toBe('Asia/Tokyo');
        expect(out.textContent).toBe(
            `${DateHelper.format(at, 'Asia/Tokyo', 'en')}|`
        );
    });
});
