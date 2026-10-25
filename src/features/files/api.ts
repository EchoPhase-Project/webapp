import { api, send, type ApiResult } from '@shared/api/client';
import type { FilePurpose, StoredFile } from '@shared/api/types';

export { contentUrl } from '@shared/api/files';

/** A page of the list; a full page means there may be more. */
export const PAGE_SIZE = 100;

/** The signed-in user's files, oldest first, the page after `after`. */
export async function listFiles(after?: string): Promise<StoredFile[]> {
    const result = await send(
        api.GET('/api/v1/files', {
            params: { query: { after, limit: PAGE_SIZE } },
        })
    );
    return result.ok ? result.data : [];
}

/** Uploads a file; the server checks its size and what it really is. */
export function uploadFile(
    file: File,
    purpose: FilePurpose = 'Attachment'
): Promise<ApiResult<StoredFile>> {
    const form = new FormData();
    form.append('File', file);
    form.append('Purpose', purpose);
    return send(
        // openapi-fetch sends FormData as is, with its multipart boundary.
        api.POST('/api/v1/files', {
            body: form as unknown as { File: string },
        })
    );
}

export function deleteFile(id: string): Promise<ApiResult<unknown>> {
    return send(api.DELETE('/api/v1/files/{id}', { params: { path: { id } } }));
}
