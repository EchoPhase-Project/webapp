// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import type { ErrorItem } from '@shared/api/types';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { expectNoA11yViolations } from '@shared/testing/axe';
import TimeZoneField, { timeZones } from './TimeZoneField';

function renderField(
    initial: string,
    extra: { errors?: ErrorItem[]; optional?: boolean } = {}
) {
    const [value, setValue] = createSignal(initial);
    const onChange = vi.fn((zone: string) => setValue(zone));
    render(() => (
        <I18nProvider>
            <TimeZoneField
                id="profile-timeZone"
                name="timeZone"
                label="Time zone"
                showLabel
                value={value()}
                onChange={onChange}
                errors={extra.errors}
                optional={extra.optional}
            />
            <button type="button">Elsewhere</button>
        </I18nProvider>
    ));
    const input = screen.getByLabelText<HTMLInputElement>('Time zone');
    input.focus();
    return { input, value, onChange };
}

const type = (input: HTMLInputElement, text: string) => {
    input.value = text;
    fireEvent.input(input);
};
const leave = (input: HTMLElement) =>
    fireEvent.focusOut(input, {
        relatedTarget: screen.getByRole('button', { name: 'Elsewhere' }),
    });
const shownZones = () =>
    screen
        .queryAllByRole('option')
        .map((o) => o.querySelector('.combobox-label')?.textContent);

describe('TimeZoneField', () => {
    afterEach(() => vi.restoreAllMocks());

    it('is a labelled combobox that shows the zone', async () => {
        const { input } = renderField('Europe/Chisinau');
        expect(input.getAttribute('role')).toBe('combobox');
        expect(input.id).toBe('profile-timeZone');
        expect(input.getAttribute('name')).toBe('timeZone');
        expect(input.value).toBe('Europe/Chisinau');
        expect(screen.getByRole('combobox', { name: 'Time zone' })).toBe(input);
        expect(input.hasAttribute('aria-invalid')).toBe(false);
        expect(timeZones()).toContain('Europe/Chisinau');
        await expectNoA11yViolations();
    });

    it('filters as the user types; a click chooses the zone', async () => {
        const { input, value, onChange } = renderField('Europe/Chisinau');
        type(input, 'berlin');
        expect(shownZones()[0]).toBe('Europe/Berlin');
        expect(screen.getByRole('status').textContent).toMatch(/^Found: \d+/);
        await expectNoA11yViolations();
        fireEvent.click(screen.getByRole('option', { name: 'Europe/Berlin' }));
        expect(onChange).toHaveBeenCalledWith('Europe/Berlin');
        expect(value()).toBe('Europe/Berlin');
        expect(input.value).toBe('Europe/Berlin');
    });

    it('finds a zone by its city in words, and shows the offset', () => {
        const { input } = renderField('Europe/Chisinau');
        type(input, 'new york');
        expect(shownZones()[0]).toBe('America/New_York');
        const hint = screen
            .getByRole('option', { name: 'America/New_York' })
            .querySelector('.combobox-hint')?.textContent;
        expect(hint).toMatch(/^New York · UTC-[45]$/);
    });

    it('lets no unknown zone in: the text goes back', () => {
        const { input, onChange } = renderField('Europe/Chisinau');
        type(input, 'Mars/Olympus_Mons');
        expect(screen.getByRole('status').textContent).toBe('Nothing found');
        leave(input);
        expect(onChange).not.toHaveBeenCalled();
        expect(input.value).toBe('Europe/Chisinau');
    });

    it('takes a typed zone id, whatever its case', () => {
        const { input, value } = renderField('Europe/Chisinau');
        type(input, 'europe/berlin');
        leave(input);
        expect(value()).toBe('Europe/Berlin');
    });

    it('does not call onChange for the same zone', () => {
        const { input, onChange } = renderField('Europe/Chisinau');
        type(input, 'chisinau');
        fireEvent.click(
            screen.getByRole('option', { name: 'Europe/Chisinau' })
        );
        type(input, 'Europe/Chisinau');
        leave(input);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('keeps a zone that the browser does not list, and offers UTC', () => {
        const { input } = renderField('Europe/Kiev');
        expect(input.value).toBe('Europe/Kiev');
        type(input, 'utc');
        expect(shownZones()[0]).toBe('UTC');
    });

    it('shows the server’s errors under the field, wired to it', async () => {
        const { input } = renderField('Europe/Chisinau', {
            errors: [
                {
                    code: 'InvalidTimeZone',
                    message: 'Unknown time zone.',
                    field: 'timeZone',
                },
            ],
        });
        expect(input.getAttribute('aria-invalid')).toBe('true');
        const list = document.getElementById(
            input.getAttribute('aria-describedby') ?? ''
        );
        expect(list?.id).toBe('profile-timeZone-error');
        expect(list?.textContent).toMatch(/^Unknown time zone/);
        await expectNoA11yViolations();
        type(input, 'lon');
        await expectNoA11yViolations();
    });

    it('an optional field clears the zone when emptied', () => {
        const { input, value } = renderField('Europe/Chisinau', {
            optional: true,
        });
        type(input, '');
        leave(input);
        expect(value()).toBe('');
        expect(input.value).toBe('');
    });

    it('a required field does not clear', () => {
        const { input, onChange } = renderField('Europe/Chisinau');
        type(input, '');
        leave(input);
        expect(onChange).not.toHaveBeenCalled();
        expect(input.value).toBe('Europe/Chisinau');
    });

    it('without the browser’s list, keeps the zone and says why', async () => {
        vi.spyOn(Intl, 'supportedValuesOf').mockImplementation(() => {
            throw new RangeError('not supported');
        });
        const { input } = renderField('Europe/Chisinau');
        expect(input.value).toBe('Europe/Chisinau');
        const note = document.getElementById(
            input.getAttribute('aria-describedby') ?? ''
        );
        expect(note?.textContent).toMatch(/cannot list the time zones/);
        fireEvent.click(input);
        expect(shownZones()).toEqual(['Europe/Chisinau', 'UTC']);
        await expectNoA11yViolations();
    });
});
