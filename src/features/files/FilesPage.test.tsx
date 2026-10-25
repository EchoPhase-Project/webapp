// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { CsrfService } from '@shared/api/csrf';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import FilesPage from './FilesPage';

const file = (id: string, name: string, size = 2_500_000) => ({
    id,
    purpose: 'Attachment',
    name,
    contentType: 'application/octet-stream',
    size,
    sha256: '00',
    createdAt: '2026-10-25T10:00:00Z',
});

const pick = (picked: File) => {
    const input =
        document.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', {
        value: [picked],
        configurable: true,
    });
    fireEvent.change(input);
};

describe('FilesPage', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        sessionStorage.clear();
    });

    it('lists files with download links and sizes', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/files': () => json(200, [file('f1', 'report.zip')]),
        });

        renderPage(() => <FilesPage />);

        const link = await screen.findByRole('link', { name: 'report.zip' });
        expect(link.getAttribute('href')).toBe('/api/v1/files/f1/content');
        expect(screen.getByText('2.4 MB')).toBeTruthy();
        expect(screen.getByText('Attachment')).toBeTruthy();
    });

    it('uploads a file as multipart with the CSRF token', async () => {
        CsrfService.saveToken('t0k3n');
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/files': () => json(200, []),
            'POST /api/v1/files': () => json(201, file('f2', 'notes.txt', 5)),
        });

        renderPage(() => <FilesPage />);
        await screen.findByText('No files yet');

        pick(new File(['hello'], 'notes.txt', { type: 'text/plain' }));

        expect(await screen.findByText('notes.txt')).toBeTruthy();
        const [upload] = api.calls('POST /api/v1/files');
        expect(upload.headers.get(CsrfService.HEADER)).toBe('t0k3n');
        expect(upload.headers.get('Content-Type')).toMatch(
            /^multipart\/form-data; boundary=/
        );
        // jsdom's File loses its name on the way into undici's body.
        const body = await upload.text();
        expect(body).toMatch(
            /name="File"; filename=.*\r\nContent-Type: text\/plain/
        );
        expect(body).toMatch(/name="Purpose"\r\n\r\nAttachment/);
    });

    it('says why an upload was refused', async () => {
        fakeApi({
            ...signedIn,
            'GET /api/v1/files': () => json(200, []),
            'POST /api/v1/files': () =>
                json(413, {
                    code: 'FileTooLarge',
                    message: 'The file is larger than 100 MB.',
                }),
        });

        renderPage(() => <FilesPage />);
        await screen.findByText('No files yet');

        pick(new File(['x'], 'big.bin'));

        expect((await screen.findByRole('alert')).textContent).toContain(
            'larger than 100 MB'
        );
    });

    it('deletes a file after a yes', async () => {
        const api = fakeApi({
            ...signedIn,
            'GET /api/v1/files': () => json(200, [file('f1', 'report.zip')]),
            'DELETE /api/v1/files/f1': () => json(204),
        });

        renderPage(() => <FilesPage />);

        fireEvent.click(
            await screen.findByRole('button', { name: 'Delete report.zip' })
        );
        fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

        await waitFor(() =>
            expect(screen.queryByText('report.zip')).toBeNull()
        );
        expect(api.calls('DELETE /api/v1/files/f1')).toHaveLength(1);
    });
});
