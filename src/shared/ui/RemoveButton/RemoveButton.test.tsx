// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { expectNoA11yViolations } from '@shared/testing/axe';
import RemoveButton from './RemoveButton';

describe('RemoveButton', () => {
    it('is a red icon button named by what it removes, also as its tooltip', async () => {
        const onClick = vi.fn();
        render(() => (
            <RemoveButton label="Delete report.pdf" onClick={onClick} />
        ));
        const button = screen.getByRole('button', {
            name: 'Delete report.pdf',
        });
        expect(button.getAttribute('title')).toBe('Delete report.pdf');
        expect(button.classList.contains('btn-icon-danger')).toBe(true);
        fireEvent.click(button);
        expect(onClick).toHaveBeenCalledOnce();
        await expectNoA11yViolations();
    });

    it('does nothing while disabled', () => {
        const onClick = vi.fn();
        render(() => (
            <RemoveButton label="Remove Ann" disabled onClick={onClick} />
        ));
        const button = screen.getByRole('button', { name: 'Remove Ann' });
        expect((button as HTMLButtonElement).disabled).toBe(true);
    });
});
