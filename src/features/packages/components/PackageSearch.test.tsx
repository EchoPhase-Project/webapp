// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { fakeApi, json, signedIn } from '@shared/testing/fake-api';
import { renderPage } from '@shared/testing/render-page';
import PackageSearch from './PackageSearch';

const TAGS = 'GET /api/v1/workflow-packages/explore/tags';

function Search() {
    const [value, setValue] = createSignal('tag:');
    return <PackageSearch value={value()} onInput={setValue} />;
}

describe('PackageSearch', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('offers the tags in use after tag:, asked again only after five minutes', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-01T10:00:00Z'));
        const api = fakeApi({
            ...signedIn,
            [TAGS]: () => json(200, [{ tag: 'discord-bot', packages: 4 }]),
        });
        renderPage(() => <Search />);
        const input = await screen.findByRole('combobox');

        fireEvent.focus(input);
        expect(await screen.findByText('discord-bot')).toBeTruthy();
        expect(screen.getByText('4 packages')).toBeTruthy();
        expect(api.calls(TAGS)).toHaveLength(1);

        // Closed and opened again within five minutes: from the cache.
        fireEvent.blur(input);
        vi.setSystemTime(new Date('2026-11-01T10:04:00Z'));
        fireEvent.focus(input);
        expect(await screen.findByText('discord-bot')).toBeTruthy();
        expect(api.calls(TAGS)).toHaveLength(1);

        fireEvent.blur(input);
        vi.setSystemTime(new Date('2026-11-01T10:06:00Z'));
        fireEvent.focus(input);
        await waitFor(() => expect(api.calls(TAGS)).toHaveLength(2));
    });
});
