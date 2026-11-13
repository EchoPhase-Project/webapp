// @vitest-environment jsdom
import { render, screen } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@shared/i18n/i18n-context';
import TimeZoneField, { timeZones } from './TimeZoneField';

describe('TimeZoneField', () => {
    it('suggests the browser’s zones for its labelled input', () => {
        render(() => (
            <I18nProvider>
                <TimeZoneField
                    id="profile-timeZone"
                    name="timeZone"
                    label="Time zone"
                    showLabel
                    value="Europe/Chisinau"
                />
            </I18nProvider>
        ));

        const input = screen.getByLabelText<HTMLInputElement>('Time zone');
        expect(input.value).toBe('Europe/Chisinau');
        expect(input.getAttribute('spellcheck')).toBe('false');
        const list = document.getElementById(input.getAttribute('list') ?? '');
        expect(list?.tagName).toBe('DATALIST');
        expect(list?.querySelectorAll('option')).toHaveLength(
            timeZones().length
        );
        expect(timeZones()).toContain('Europe/Chisinau');
    });
});
