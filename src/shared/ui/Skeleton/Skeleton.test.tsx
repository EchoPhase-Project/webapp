// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createSignal } from 'solid-js';
import { render, screen } from '@solidjs/testing-library';
import { I18nProvider } from '@shared/i18n/i18n-context';
import { expectNoA11yViolations } from '@shared/testing/axe';
import {
    SkeletonBlock,
    SkeletonScope,
    SkeletonText,
    useSkeleton,
} from './Skeleton';

/** Says what useSkeleton() gives where it is. */
function Probe(props: { name: string }) {
    const loading = useSkeleton();
    return <p data-testid={props.name}>{loading() ? 'loading' : 'ready'}</p>;
}

const statuses = () =>
    [...document.querySelectorAll('[role="status"]')].map(
        (region) => region.textContent
    );

describe('SkeletonScope', () => {
    it('is not loading outside a scope', () => {
        render(() => <Probe name="outside" />);
        expect(screen.getByTestId('outside').textContent).toBe('ready');
    });

    it('hides its part while it loads and says "Loading…" once', async () => {
        const [pending, setPending] = createSignal(true);
        const { container } = render(() => (
            <I18nProvider>
                <SkeletonScope when={pending()}>
                    <Probe name="inside" />
                    <SkeletonText lines={2} />
                </SkeletonScope>
            </I18nProvider>
        ));
        const scope = container.querySelector<HTMLElement>('.skeleton-scope');
        expect(screen.getByTestId('inside').textContent).toBe('loading');
        expect(scope?.getAttribute('aria-hidden')).toBe('true');
        expect(scope?.inert).toBe(true);
        expect(statuses()).toEqual(['Loading…']);
        await expectNoA11yViolations();

        setPending(false);
        expect(screen.getByTestId('inside').textContent).toBe('ready');
        expect(scope?.hasAttribute('aria-hidden')).toBe(false);
        expect(scope?.inert).toBe(false);
        // The live region stays; only its text changes.
        expect(statuses()).toEqual(['']);
        await expectNoA11yViolations();
    });

    it('lets the nearest scope decide', () => {
        render(() => (
            <I18nProvider>
                <SkeletonScope when>
                    <Probe name="outer" />
                    <SkeletonScope when={false}>
                        <Probe name="inner" />
                    </SkeletonScope>
                </SkeletonScope>
            </I18nProvider>
        ));
        expect(screen.getByTestId('outer').textContent).toBe('loading');
        expect(screen.getByTestId('inner').textContent).toBe('ready');
        expect(statuses().filter(Boolean)).toEqual(['Loading…']);
    });

    it('says nothing itself when another region does', () => {
        render(() => (
            <I18nProvider>
                <SkeletonScope when announce={false}>
                    <Probe name="quiet" />
                </SkeletonScope>
            </I18nProvider>
        ));
        expect(screen.getByTestId('quiet').textContent).toBe('loading');
        expect(statuses()).toEqual([]);
    });
});

describe('SkeletonText and SkeletonBlock', () => {
    it('draws one bar for each line, the last one shorter', () => {
        const { container } = render(() => (
            <>
                <SkeletonText lines={3} width="40%" />
                <SkeletonBlock width="3rem" round />
            </>
        ));
        const text = container.querySelector<HTMLElement>('.skeleton-text');
        expect(text?.querySelectorAll('.skeleton-line')).toHaveLength(3);
        expect(text?.style.getPropertyValue('--skeleton-last')).toBe('40%');
        const block = container.querySelector<HTMLElement>('.skeleton-block');
        expect(block?.classList.contains('skeleton-block--round')).toBe(true);
        expect(block?.style.height).toBe('3rem');
    });
});
