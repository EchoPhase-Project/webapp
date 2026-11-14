// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { MemoryRouter, Route } from '@solidjs/router';
import BackLink from './BackLink';

describe('BackLink', () => {
    it('links back by the place’s name, the arrow hidden from screen readers', async () => {
        render(() => (
            <MemoryRouter>
                <Route
                    path="*"
                    component={() => (
                        <BackLink href="/packages" label="Packages" />
                    )}
                />
            </MemoryRouter>
        ));
        const link = await screen.findByRole('link', { name: 'Packages' });
        expect(link.getAttribute('href')).toBe('/packages');
        expect(link.className).toContain('back-link');
        expect(link.querySelector('svg')!.getAttribute('aria-hidden')).toBe(
            'true'
        );
    });
});
