// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createSignal } from 'solid-js';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { I18nProvider } from '@shared/i18n/i18n-context';
import type { ErrorItem } from '@shared/api/types';
import MarkdownEditor from './MarkdownEditor';

function renderEditor(errors?: ErrorItem[]) {
    const [text, setText] = createSignal('');
    render(() => (
        <I18nProvider>
            <MarkdownEditor
                id="m-body"
                label="Text"
                aside="Markdown works"
                errors={errors}
                value={text()}
                onChange={setText}
            />
        </I18nProvider>
    ));
    return text;
}

describe('MarkdownEditor', () => {
    it('writes in a labelled text area under named tabs', () => {
        const text = renderEditor();
        expect(screen.getByRole('tablist', { name: 'Text' })).toBeTruthy();
        expect(screen.getByText('Markdown works')).toBeTruthy();
        const area = screen.getByRole('textbox', { name: 'Text' });
        fireEvent.input(area, { target: { value: '# Hi' } });
        expect(text()).toBe('# Hi');
        expect(screen.getByRole('tabpanel').contains(area)).toBe(true);
    });

    it('previews the text, or says there is nothing to preview', () => {
        renderEditor();
        fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
        expect(screen.queryByRole('textbox', { name: 'Text' })).toBeNull();
        expect(screen.getByText('Nothing to preview yet')).toBeTruthy();

        fireEvent.click(screen.getByRole('tab', { name: 'Write' }));
        fireEvent.input(screen.getByRole('textbox', { name: 'Text' }), {
            target: { value: '**bold**' },
        });
        fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
        expect(screen.getByText('bold').tagName).toBe('STRONG');
    });

    it('shows the errors in both tabs', () => {
        renderEditor([{ code: 'TooLong', message: 'Too long.' }]);
        expect(screen.getByText('Too long.')).toBeTruthy();
        expect(
            screen
                .getByRole('textbox', { name: 'Text' })
                .getAttribute('aria-invalid')
        ).toBe('true');
        fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
        expect(screen.getByText('Too long.')).toBeTruthy();
    });
});
