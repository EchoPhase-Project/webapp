import {
    mutationOptions,
    queryOptions,
    useQuery,
    type QueryClient,
} from '@tanstack/solid-query';
import { api, ApiError, request } from './client';
import { authKeys } from './auth-keys';
import { safeNext } from './auth-guards';
import { endSession, startSession } from './session-provider';
import type {
    LoginCredentials,
    ProfileUpdate,
    RegisterData,
    User,
} from './types';

export { authKeys };

/**
 * Who is signed in: null when nobody is (/auth/me answers 401). Only a 401:
 * a dropped connection or a 5xx stays an error, never "signed out". The
 * answer carries this tab's CSRF token, which the client keeps.
 */
export const meQuery = () =>
    queryOptions({
        queryKey: authKeys.me(),
        queryFn: async ({ signal }): Promise<User | null> => {
            try {
                return await request(api.GET('/api/v1/auth/me', { signal }));
            } catch (e) {
                if (e instanceof ApiError && e.status === 401) return null;
                throw e;
            }
        },
        // Asked again on coming back to the tab after a while: another tab
        // may have signed in someone else (watchUser in session-provider).
        staleTime: 5 * 60_000,
        retry: false,
    });

/** The signed-in user's roles. */
export const rolesQuery = () =>
    queryOptions({
        queryKey: authKeys.roles(),
        queryFn: ({ signal }) =>
            request(api.GET('/api/v1/roles/me', { signal })),
    });

/**
 * Signs in and asks who that is, both in mutationFn: the old session's
 * cache is not touched (its watchUser would replace the session too).
 * The new session starts at `next`, if it is a path of this site.
 */
async function signIn(call: () => Promise<unknown>): Promise<User> {
    await call();
    return request(api.GET('/api/v1/auth/me'));
}

export const loginMutation = () =>
    mutationOptions({
        mutationKey: [...authKeys.all, 'login'] as const,
        mutationFn: (v: { credentials: LoginCredentials; next?: string }) =>
            signIn(() =>
                request(api.POST('/api/v1/auth/login', { body: v.credentials }))
            ),
        onSuccess: (user, v) => startSession(user, safeNext(v.next)),
    });

// Registering also signs in: same cookies and CSRF token as login.
export const registerMutation = () =>
    mutationOptions({
        mutationKey: [...authKeys.all, 'register'] as const,
        mutationFn: (v: { data: RegisterData; next?: string }) =>
            signIn(() =>
                request(api.POST('/api/v1/auth/register', { body: v.data }))
            ),
        onSuccess: (user, v) => startSession(user, safeNext(v.next)),
    });

/** The name, username and time zone; omitted (null) fields stay. */
export const updateProfileMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...authKeys.all, 'update'] as const,
        mutationFn: (data: ProfileUpdate) =>
            request(api.PATCH('/api/v1/auth/me', { body: data })),
        onSuccess: (saved) => queryClient.setQueryData(authKeys.me(), saved),
    });

/**
 * Revokes this device's session and clears the token cookies. Signed out
 * here even when that fails; an explicit logout also forgets the user's
 * stored records.
 */
export const logoutMutation = () =>
    mutationOptions({
        mutationKey: [...authKeys.all, 'logout'] as const,
        mutationFn: () => request(api.DELETE('/api/v1/sessions/current')),
        onError: (error) => console.error('Logout failed:', error),
        onSettled: () => endSession({ forget: true }),
    });

/**
 * Who is signed in, read through Query and interpreted once. `user()`:
 * undefined while loading, null when signed out; a failed check is
 * `authError()`, not "signed out" (requireAuth: the outage screen covers it,
 * or a plain server error shows "Try again").
 */
export function useAuth() {
    const me = useQuery(meQuery);
    const roles = useQuery(() => ({ ...rolesQuery(), enabled: !!me.data }));
    return {
        user: () => me.data,
        roles: () => roles.data,
        isAuthenticated: () => !!me.data,
        authError: () => me.error,
    };
}
