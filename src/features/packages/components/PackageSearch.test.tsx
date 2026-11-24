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

    it('moves with the arrows (round the ends), picks with Enter, closes with Escape', async () => {
        fakeApi({
            ...signedIn,
            [TAGS]: () =>
                json(200, [
                    { tag: 'alpha', packages: 1 },
                    { tag: 'beta', packages: 2 },
                    { tag: 'gamma', packages: 3 },
                ]),
        });
        renderPage(() => <Search />);
        const input = await screen.findByRole<HTMLInputElement>('combobox');
        const selected = () =>
            screen
                .getAllByRole('option')
                .find((o) => o.getAttribute('aria-selected') === 'true')
                ?.textContent;
        const key = (k: string) => fireEvent.keyDown(input, { key: k });

        // A real focus, as in a browser: pick() focuses the input again.
        input.focus();
        await screen.findByText('alpha');
        expect(selected()).toContain('alpha');
        key('ArrowDown');
        expect(selected()).toContain('beta');
        key('ArrowUp');
        key('ArrowUp');
        expect(selected()).toContain('gamma');
        expect(input.getAttribute('aria-activedescendant')).toMatch(/-2$/);

        // A tag is final: Enter puts it in with a space, and the list closes.
        key('Enter');
        expect(input.value).toBe('tag:gamma ');
        expect(input.getAttribute('aria-expanded')).toBe('false');

        // ArrowDown opens it again (the qualifiers for a new word).
        key('ArrowDown');
        expect(input.getAttribute('aria-expanded')).toBe('true');
        key('Escape');
        expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    it('lets Tab pick a qualifier but leave a tag to the browser', async () => {
        fakeApi({
            ...signedIn,
            [TAGS]: () => json(200, [{ tag: 'alpha', packages: 1 }]),
        });
        function Empty() {
            const [value, setValue] = createSignal('');
            return <PackageSearch value={value()} onInput={setValue} />;
        }
        renderPage(() => <Empty />);
        const input = await screen.findByRole<HTMLInputElement>('combobox');

        // A real focus, as in a browser: pick() focuses the input again.
        input.focus();
        await screen.findByText('tag:');
        // Not final: Tab completes it, and the tags of tag: come.
        expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(false);
        expect(input.value).toBe('tag:');
        await screen.findByText('alpha');
        // A tag is final: Tab does not pick it, so the focus can move on.
        expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(true);
        expect(input.value).toBe('tag:');
    });
});
