import {
    infiniteQueryOptions,
    mutationOptions,
    type QueryClient,
} from '@tanstack/solid-query';
import { api, multipart, request } from '@shared/api/client';
import type { FilePurpose, StoredFile } from '@shared/api/types';
import {
    appendItem,
    cursorPages,
    removeItem,
    type Page,
} from '@shared/api/paged-list';

export { contentUrl } from '@shared/api/files';

/** A page of the list; a full page means there may be more. */
export const PAGE_SIZE = 100;

export const fileKeys = {
    all: ['files'] as const,
    mine: () => [...fileKeys.all, 'mine'] as const,
};

const fileId = (file: StoredFile) => file.id;

/** The signed-in user's files, oldest first, a page at a time. */
export const filesInfiniteQuery = () =>
    infiniteQueryOptions({
        queryKey: fileKeys.mine(),
        queryFn: async ({ pageParam, signal }): Promise<Page<StoredFile>> => {
            const files = await request<StoredFile[]>(
                api.GET('/api/v1/files', {
                    params: { query: { after: pageParam, limit: PAGE_SIZE } },
                    signal,
                })
            );
            // A full page: there may be more after it, after its last file.
            return {
                items: files,
                next:
                    files.length === PAGE_SIZE
                        ? (files.at(-1)?.id ?? null)
                        : null,
            };
        },
        ...cursorPages,
    });

/**
 * Uploads a file; the server checks its size and what it really is. The
 * list is oldest first: the new file goes at its end, once all are shown.
 */
export const uploadFileMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...fileKeys.all, 'upload'] as const,
        mutationFn: (v: { file: File; purpose?: FilePurpose }) =>
            request<StoredFile>(
                api.POST('/api/v1/files', {
                    body: multipart({
                        File: v.file,
                        Purpose: v.purpose ?? 'Attachment',
                    }),
                })
            ),
        onSuccess: (stored) => appendItem(queryClient, fileKeys.mine(), stored),
    });

/** Deletes a file: its row leaves the list, with no request for it. */
export const deleteFileMutation = (queryClient: QueryClient) =>
    mutationOptions({
        mutationKey: [...fileKeys.all, 'delete'] as const,
        mutationFn: (id: string) =>
            request(
                api.DELETE('/api/v1/files/{id}', { params: { path: { id } } })
            ),
        onSuccess: (_, id) =>
            removeItem(queryClient, fileKeys.mine(), id, fileId),
    });
