import {
    mutationOptions,
    queryOptions,
    type QueryClient,
} from '@tanstack/solid-query';
import { api, dataOr, request, send, type ApiResult } from '@shared/api/client';
import type { Note, NoteInput, NoteShare } from '@shared/api/types';

// Only the shares are on Query so far; the rest moves in step 6.
export const noteKeys = {
    all: ['notes'] as const,
    detail: (id: string) => [...noteKeys.all, 'detail', id] as const,
    shares: (id: string) => [...noteKeys.detail(id), 'shares'] as const,
};

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

/** The caller's notes and those shared with them; `q` searches title and text. */
export async function listNotes(q?: string): Promise<Note[]> {
    const result = await send(
        api.GET('/api/v1/notes', {
            params: { query: { q: q || undefined, limit: 500 } },
        })
    );
    return dataOr(result, []);
}

export function getNote(id: string): Promise<ApiResult<Note>> {
    return send(api.GET('/api/v1/notes/{id}', { params: { path: { id } } }));
}

export function createNote(body: NoteInput): Promise<ApiResult<Note>> {
    return send(api.POST('/api/v1/notes', { body }));
}

export function updateNote(
    id: string,
    body: NoteInput
): Promise<ApiResult<Note>> {
    return send(
        api.PUT('/api/v1/notes/{id}', { params: { path: { id } }, body })
    );
}

export function deleteNote(id: string): Promise<ApiResult<unknown>> {
    return send(api.DELETE('/api/v1/notes/{id}', { params: { path: { id } } }));
}

/** The owner removes someone, or the caller leaves a note shared with them. */
export function unshareNote(
    id: string,
    userId: string
): Promise<ApiResult<unknown>> {
    return send(
        api.DELETE('/api/v1/notes/{id}/shares/{userId}', {
            params: { path: { id, userId } },
        })
    );
}
