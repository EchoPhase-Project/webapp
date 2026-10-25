import { api, send, type ApiResult } from '@shared/api/client';
import type { Note, NoteInput, NoteShare } from '@shared/api/types';

/** The caller's notes and those shared with them; `q` searches title and text. */
export async function listNotes(q?: string): Promise<Note[]> {
    const result = await send(
        api.GET('/api/v1/notes', {
            params: { query: { q: q || undefined, limit: 500 } },
        })
    );
    return result.ok ? result.data : [];
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

export async function listShares(id: string): Promise<NoteShare[]> {
    const result = await send(
        api.GET('/api/v1/notes/{id}/shares', { params: { path: { id } } })
    );
    return result.ok ? result.data : [];
}

export function shareNote(
    id: string,
    userName: string,
    canEdit: boolean
): Promise<ApiResult<NoteShare>> {
    return send(
        api.PUT('/api/v1/notes/{id}/shares', {
            params: { path: { id } },
            body: { userName, canEdit },
        })
    );
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
