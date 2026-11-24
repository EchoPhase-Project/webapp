// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { waitFor } from '@solidjs/testing-library';
import { fakeApi, json } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import AuthRedirect from './AuthRedirect';

describe('AuthRedirect', () => {
    it.each([
        ['/auth', '/auth/login'],
        ['/auth?next=%2Ffiles', '/auth/login?next=%2Ffiles'],
        ['/auth?mode=signup&next=%2Ffiles', '/auth/signup?next=%2Ffiles'],
        ['/auth/register', '/auth/signup'],
    ])('sends %s to %s', async (from, to) => {
        fakeApi({
            'GET /api/v1/auth/me': () =>
                json(401, { code: 'Unauthorized', message: 'no' }),
        });
        const { history } = renderPage(() => <AuthRedirect />, from);
        await waitFor(() => expect(history.get()).toBe(to));
    });
});
