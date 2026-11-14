// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { ApiError, NetworkError } from './client';
import { createAppQueryClient } from './query-client';

const status = (code: number) =>
    new ApiError([{ code: `http_${code}`, message: 'x' }], code);

// The app's own settings, not a test client's.
const retry = () => {
    const rule = createAppQueryClient().getDefaultOptions().queries?.retry;
    if (typeof rule !== 'function') throw new Error('no retry rule');
    return rule;
};

describe('createAppQueryClient', () => {
    it('does not retry a 4xx answer', () => {
        for (const code of [400, 401, 403, 404, 409, 422])
            expect(retry()(0, status(code))).toBe(false);
    });

    it('retries a 5xx and no answer at all, twice at most', () => {
        for (const error of [
            status(500),
            status(503),
            new ApiError([NetworkError], 0),
        ]) {
            expect(retry()(0, error)).toBe(true);
            expect(retry()(1, error)).toBe(true);
            expect(retry()(2, error)).toBe(false);
        }
    });

    it('makes three attempts for a 5xx, one for a 4xx', async () => {
        const client = createAppQueryClient();
        let calls = 0;
        await expect(
            client.fetchQuery({
                queryKey: ['x'],
                queryFn: () => {
                    calls++;
                    throw status(502);
                },
                retryDelay: 0,
            })
        ).rejects.toBeInstanceOf(ApiError);
        expect(calls).toBe(3);

        calls = 0;
        await expect(
            client.fetchQuery({
                queryKey: ['y'],
                queryFn: () => {
                    calls++;
                    throw status(404);
                },
                retryDelay: 0,
            })
        ).rejects.toBeInstanceOf(ApiError);
        expect(calls).toBe(1);
    });

    it('does not retry mutations, and keeps 30 s of freshness', () => {
        const options = createAppQueryClient().getDefaultOptions();
        expect(options.mutations?.retry).toBe(false);
        expect(options.queries?.staleTime).toBe(30_000);
    });

    it('takes overrides for tests', () => {
        const options = createAppQueryClient({
            queries: { retry: false, gcTime: Infinity },
        }).getDefaultOptions();
        expect(options.queries?.retry).toBe(false);
        expect(options.queries?.gcTime).toBe(Infinity);
        expect(options.queries?.staleTime).toBe(30_000);
        expect(options.mutations?.retry).toBe(false);
    });
});
