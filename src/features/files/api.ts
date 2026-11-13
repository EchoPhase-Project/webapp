import {
    api,
    dataOr,
    multipart,
    send,
    type ApiResult,
} from '@shared/api/client';
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
    return dataOr(result, []);
}

/** Uploads a file; the server checks its size and what it really is. */
export function uploadFile(
    file: File,
    purpose: FilePurpose = 'Attachment'
): Promise<ApiResult<StoredFile>> {
    return send(
        api.POST('/api/v1/files', {
            body: multipart({ File: file, Purpose: purpose }),
        })
    );
}

export function deleteFile(id: string): Promise<ApiResult<unknown>> {
    return send(api.DELETE('/api/v1/files/{id}', { params: { path: { id } } }));
}
