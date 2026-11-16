// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import Button from '@shared/ui/Button';
import { expectNoA11yViolations } from '@shared/testing/axe';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
    it('says the list is empty and offers its action', async () => {
        render(() => (
            <EmptyState action={<Button>New note</Button>}>
                No notes yet.
            </EmptyState>
        ));
        expect(screen.getByText('No notes yet.')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'New note' })).toBeTruthy();
        await expectNoA11yViolations();
    });
});
