/**
 * Where a stored file's content is: the session cookie goes along, so an
 * <img> or a download link works as is. Pictures show inline, the rest
 * downloads.
 */
export const contentUrl = (id: string) =>
    `/api/v1/files/${encodeURIComponent(id)}/content`;
