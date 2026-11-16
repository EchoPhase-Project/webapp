// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { IconCopy } from '@shared/ui/icons';
import { expectNoA11yViolations } from '@shared/testing/axe';
import Button from './Button';

describe('Button', () => {
    it('does not submit, says when it is busy, and an icon button takes its name', async () => {
        render(() => (
            <form>
                <Button busy>Save</Button>
                <Button variant="icon" aria-label="Copy the address">
                    <IconCopy />
                </Button>
            </form>
        ));
        const save = screen.getByRole<HTMLButtonElement>('button', {
            name: 'Save',
        });
        expect(save.type).toBe('button');
        expect(save.disabled).toBe(true);
        expect(save.getAttribute('aria-busy')).toBe('true');
        const copy = screen.getByRole('button', { name: 'Copy the address' });
        expect(copy.classList.contains('btn-icon')).toBe(true);
        await expectNoA11yViolations();
    });
});
