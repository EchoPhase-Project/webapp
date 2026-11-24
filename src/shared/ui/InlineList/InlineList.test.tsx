// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { Show } from 'solid-js';
import { render } from '@solidjs/testing-library';
import { expectNoA11yViolations } from '@shared/testing/axe';
import InlineList from './InlineList';

describe('InlineList', () => {
    it('puts a hidden dot and a comma for screen readers between the parts', async () => {
        const { container } = render(() => (
            <p>
                <InlineList
                    class="meta"
                    items={['Bamako', <b>UTC+0</b>, 'today']}
                />
            </p>
        ));
        const list = container.querySelector('.inline-list.meta');
        expect(
            [...container.querySelectorAll('.inline-list-text')].map(
                (part) => part.textContent
            )
        ).toEqual(['Bamako', 'UTC+0', 'today']);
        const dots = container.querySelectorAll('.inline-list-sep');
        expect(dots).toHaveLength(2);
        dots.forEach((dot) =>
            expect(dot.getAttribute('aria-hidden')).toBe('true')
        );
        // Read as "Bamako, UTC+0, today".
        expect(list?.textContent).toBe('Bamako, UTC+0, today');
        await expectNoA11yViolations();
    });

    it('leaves out empty parts, also a part that renders nothing', () => {
        const { container } = render(() => (
            <InlineList
                items={[
                    '',
                    'one',
                    null,
                    false,
                    <Show when={false}>
                        <span>never</span>
                    </Show>,
                    'two',
                ]}
            />
        ));
        expect(container.textContent).toBe('one, two');
        expect(container.querySelectorAll('.inline-list-sep')).toHaveLength(1);
    });

    it('keeps each dot with the part before it', () => {
        const { container } = render(() => <InlineList items={['a', 'b']} />);
        const [first, last] = container.querySelectorAll('.inline-list-item');
        expect(first?.querySelector('.inline-list-sep')).not.toBeNull();
        expect(last?.querySelector('.inline-list-sep')).toBeNull();
    });
});
