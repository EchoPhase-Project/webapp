// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { authKeys } from '@shared/api/auth';
import { sessionClient } from '@shared/api/session-provider';
import { createSubmit } from '@shared/api/submit';
import { fakeApi, json, user } from '@shared/testing/fake-api';
import { withSession } from '@shared/testing/render-page';
import {
    changePasswordMutation,
    removeAvatarMutation,
    setAvatarMutation,
} from './api';

// The invalidation table (plan §5.9), the profile's rows: what a mutation
// leaves in the session's cache.

describe('profile mutations', () => {
    it('a new picture: the signed-in user gets it at once, nothing asked again', async () => {
        fakeApi({
            'PUT /api/v1/auth/me/avatar': () => json(200, { id: 'a1' }),
        });
        const set = withSession(() =>
            createSubmit().mutation(setAvatarMutation)
        );
        sessionClient().setQueryData(authKeys.me(), user());

        await set.run(new File(['png'], 'me.png', { type: 'image/png' }));

        expect(sessionClient().getQueryData(authKeys.me())).toEqual(
            user({ avatarFileId: 'a1' })
        );
        expect(
            sessionClient().getQueryState(authKeys.me())?.isInvalidated
        ).toBe(false);
    });

    it('a removed picture: the signed-in user has none at once', async () => {
        fakeApi({
            'DELETE /api/v1/auth/me/avatar': () =>
                new Response(null, { status: 204 }),
        });
        const remove = withSession(() =>
            createSubmit().mutation(removeAvatarMutation)
        );
        sessionClient().setQueryData(
            authKeys.me(),
            user({ avatarFileId: 'a1' })
        );

        await remove.run();

        expect(sessionClient().getQueryData(authKeys.me())).toEqual(
            user({ avatarFileId: null })
        );
    });

    it('a new password: the signed-in user is asked again (a new CSRF token)', async () => {
        fakeApi({
            'POST /api/v1/auth/me/password': () =>
                new Response(null, { status: 204 }),
        });
        const change = withSession(() =>
            createSubmit().mutation(changePasswordMutation)
        );
        sessionClient().setQueryData(authKeys.me(), user());

        await change.run({
            currentPassword: 'Old-pass1',
            newPassword: 'New-pass1',
        });

        expect(
            sessionClient().getQueryState(authKeys.me())?.isInvalidated
        ).toBe(true);
    });
});
