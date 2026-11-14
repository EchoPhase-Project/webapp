import {
    keepPreviousData,
    mutationOptions,
    queryOptions,
    type QueryClient,
} from '@tanstack/solid-query';
import { api, request } from '@shared/api/client';
import type { Note, NoteInput, NoteShare } from '@shared/api/types';

export const noteKeys = {
    all: ['notes'] as const,
    lists: () => [...noteKeys.all, 'list'] as const,
    list: (q: string) => [...noteKeys.lists(), { q }] as const,
    detail: (id: string) => [...noteKeys.all, 'detail', id] as const,
    shares: (id: string) => [...noteKeys.detail(id), 'shares'] as const,
};

/**
 * The caller's notes and those shared with them; `q` searches title and
 * text. No search, an empty one and one of spaces are one key. While a new
 * search is out, the last answer stays shown.
 */
export const notesQuery = (q?: string) => {
    const search = q?.trim() ?? '';
    return queryOptions({
        queryKey: noteKeys.list(search),
        queryFn: ({ signal }) =>
            request<Note[]>(
                api.GET('/api/v1/notes', {
                    params: { query: { q: search || undefined, limit: 500 } },
                    signal,
                })
            ),
        placeholderData: keepPreviousData,
    });
};

/** One note, as the caller may see it. */
export const noteQuery = (id: string) =>
    queryOptions({
        queryKey: noteKeys.detail(id),
        queryFn: ({ signal }) =>
            request<Note>(
                api.GET('/api/v1/notes/{id}', {
                    params: { path: { id } },
                    signal,
                })
            ),
    });

/** A note saved: kept as the server answered it, and the lists asked again. */
function saved(queryClient: QueryClient, note: Note) {
    queryClient.setQueryData(noteKeys.detail(note.id), note);
    return queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
}

/** A note gone for the caller: all about it dropped, the lists asked again. */
function gone(queryClient: QueryClient, id: string) {
    queryClient.removeQueries({ queryKey: noteKeys.detail(id) });
    return queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
}

/** A new note of the caller's. */
export const createNoteMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...noteKeys.all, 'create'] as const,
        mutationFn: (body: NoteInput) =>
            request<Note>(api.POST('/api/v1/notes', { body })),
        onSuccess: (note) => saved(queryClient, note),
    });

/** A note saved over the version opened (`body.expectedStamp`). */
export const updateNoteMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...noteKeys.all, 'update'] as const,
        mutationFn: (v: { id: string; body: NoteInput }) =>
            request<Note>(
                api.PUT('/api/v1/notes/{id}', {
                    params: { path: { id: v.id } },
                    body: v.body,
                })
            ),
        onSuccess: (note) => saved(queryClient, note),
    });

/** The owner deletes a note, for everyone it is shared with too. */
export const deleteNoteMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...noteKeys.all, 'delete'] as const,
        mutationFn: (id: string) =>
            request(
                api.DELETE('/api/v1/notes/{id}', { params: { path: { id } } })
            ),
        onSuccess: (_, id) => gone(queryClient, id),
    });

/** The caller (`userId`) leaves a note shared with them. */
export const leaveNoteMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...noteKeys.all, 'leave'] as const,
        mutationFn: (v: { id: string; userId: string }) =>
            request(
                api.DELETE('/api/v1/notes/{id}/shares/{userId}', {
                    params: { path: { id: v.id, userId: v.userId } },
                })
            ),
        onSuccess: (_, v) => gone(queryClient, v.id),
    });

/** Whom a note is shared with, for its owner. */
export const noteSharesQuery = (id: string) =>
    queryOptions({
        queryKey: noteKeys.shares(id),
        queryFn: ({ signal }) =>
            request<NoteShare[]>(
                api.GET('/api/v1/notes/{id}/shares', {
                    params: { path: { id } },
                    signal,
                })
            ),
    });

/** The note `id` shared with one more person, by username. */
export const shareNoteMutation = (
    queryClient: QueryClient,
    id: string,
    canEdit: boolean
) =>
    mutationOptions({
        mutationKey: [...noteKeys.all, 'share'] as const,
        mutationFn: (userName: string) =>
            request<NoteShare>(
                api.PUT('/api/v1/notes/{id}/shares', {
                    params: { path: { id } },
                    body: { userName, canEdit },
                })
            ),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: noteKeys.shares(id) }),
    });

/** The owner removes someone (by user id) from the note `id`. */
export const unshareNoteMutation = (queryClient: QueryClient, id: string) =>
    mutationOptions({
        mutationKey: [...noteKeys.all, 'unshare'] as const,
        mutationFn: (userId: string) =>
            request(
                api.DELETE('/api/v1/notes/{id}/shares/{userId}', {
                    params: { path: { id, userId } },
                })
            ),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: noteKeys.shares(id) }),
    });
