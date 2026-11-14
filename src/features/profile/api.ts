import { mutationOptions, type QueryClient } from '@tanstack/solid-query';
import { api, multipart, request } from '@shared/api/client';
import { authKeys } from '@shared/api/auth';
import type { PasswordChange, StoredFile, User } from '@shared/api/types';

/** The signed-in user (as /auth/me answered) with another picture, or none. */
function pictured(queryClient: QueryClient, fileId: string | null) {
    queryClient.setQueryData(
        authKeys.me(),
        (me: User | null | undefined) => me && { ...me, avatarFileId: fileId }
    );
}

/** Sets the signed-in user's picture (PNG, JPEG or WebP); replaces the old one. */
export const setAvatarMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...authKeys.all, 'avatar', 'set'] as const,
        mutationFn: (file: File) =>
            request<StoredFile>(
                api.PUT('/api/v1/auth/me/avatar', {
                    body: multipart({ File: file }),
                })
            ),
        onSuccess: (stored) => pictured(queryClient, stored.id),
    });

/** Removes the signed-in user's picture: their initial shows instead. */
export const removeAvatarMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...authKeys.all, 'avatar', 'remove'] as const,
        mutationFn: () => request(api.DELETE('/api/v1/auth/me/avatar')),
        onSuccess: () => pictured(queryClient, null),
    });

/**
 * A new password; the current one must be right. Other devices are signed
 * out; this one gets new tokens, so /auth/me is asked again for this tab's
 * new CSRF token.
 */
export const changePasswordMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...authKeys.all, 'password'] as const,
        mutationFn: (body: PasswordChange) =>
            request(api.POST('/api/v1/auth/me/password', { body })),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: authKeys.me() }),
    });
