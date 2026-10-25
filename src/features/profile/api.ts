import { api, send, type ApiResult } from '@shared/api/client';
import type { StoredFile } from '@shared/api/types';

/** Sets the signed-in user's picture (PNG, JPEG or WebP); replaces the old one. */
export function setAvatar(file: File): Promise<ApiResult<StoredFile>> {
    const form = new FormData();
    form.append('File', file);
    return send(
        api.PUT('/api/v1/auth/me/avatar', {
            body: form as unknown as { File: string },
        })
    );
}

export function removeAvatar(): Promise<ApiResult<unknown>> {
    return send(api.DELETE('/api/v1/auth/me/avatar'));
}
