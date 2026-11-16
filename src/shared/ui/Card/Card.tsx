import { Show, splitProps, type JSX } from 'solid-js';
import { SkeletonText, useSkeleton } from '@shared/ui/Skeleton';

type CardProps = JSX.HTMLAttributes<HTMLDivElement> & {
    /** The flowing-lines pattern: for brand moments, not working surfaces. */
    patterned?: boolean;
    /** Lines of bars in the loading form (3 by default). */
    skeletonLines?: number;
};

/**
 * A surface that is one thing (a notice, a panel), set off by shadow. Its
 * loading form (in a `SkeletonScope` that loads) keeps the frame and shows
 * lines of bars in place of the content.
 */
export default function Card(props: CardProps) {
    const [own, rest] = splitProps(props, [
        'patterned',
        'class',
        'children',
        'skeletonLines',
    ]);
    const loading = useSkeleton();
    return (
        <div
            class={['card', own.patterned && 'patterned', own.class]
                .filter(Boolean)
                .join(' ')}
            {...rest}
        >
            <Show
                when={!loading()}
                fallback={<SkeletonText lines={own.skeletonLines ?? 3} />}
            >
                {own.children}
            </Show>
        </div>
    );
}
