import type { QueryKey } from '@tanstack/solid-query';

/**
 * The session's query keys. A module of their own: both auth.ts and
 * session-provider.tsx need them, and those two import each other.
 */
export const authKeys = {
    all: ['auth'] as const,
    me: () => [...authKeys.all, 'me'] as const,
    roles: () => [...authKeys.all, 'roles'] as const,
};

/** Whether `key` is the signed-in user's (authKeys.me()). */
export const isMeKey = (key: QueryKey) =>
    key.length === 2 && key[0] === authKeys.all[0] && key[1] === 'me';
